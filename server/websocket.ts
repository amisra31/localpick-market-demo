import { Server } from 'http';
import { db, schema } from './db';
import { eq, and } from 'drizzle-orm';

// Import WebSocket with compatibility handling
import WebSocket, { WebSocketServer } from 'ws';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userType?: 'customer' | 'merchant';
  shopId?: string;
  isAlive?: boolean;
}

interface ChatSession {
  customerId: string;
  shopId: string;
  productId?: string;
}

interface WebSocketMessage {
  type: 'join_chat' | 'leave_chat' | 'new_message' | 'message_read' | 'ping' | 'auth';
  payload?: any;
  chatSession?: ChatSession;
  messageId?: string;
  userId?: string;
  userType?: 'customer' | 'merchant';
  shopId?: string;
}

export class WebSocketManager {
  private wss: any;
  private clients: Map<string, AuthenticatedWebSocket> = new Map();
  private chatSessions: Map<string, Set<string>> = new Map(); // chatId -> set of client IDs

  constructor(server: Server) {
    try {
      this.wss = new WebSocketServer({ 
        server,
        path: '/ws'
      });
      console.log('✅ WebSocket Server created successfully');
    } catch (error) {
      console.error('❌ Failed to create WebSocket Server:', error);
      throw error;
    }

    this.setupWebSocketServer();
    this.setupHeartbeat();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, request) => {
      const clientId = this.generateClientId();
      ws.isAlive = true;
      
      console.log(`New WebSocket connection: ${clientId}`);
      this.clients.set(clientId, ws);

      ws.on('message', async (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          await this.handleMessage(clientId, ws, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket connection closed: ${clientId}`);
        this.handleDisconnect(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for ${clientId}:`, error);
        this.handleDisconnect(clientId);
      });

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Send connection confirmation
      this.sendMessage(ws, {
        type: 'connection_established',
        payload: { clientId }
      });
    });
  }

  private async handleMessage(clientId: string, ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    console.log(`Received message from ${clientId}:`, message.type);

    switch (message.type) {
      case 'auth':
        await this.handleAuth(clientId, ws, message);
        break;
      
      case 'join_chat':
        await this.handleJoinChat(clientId, ws, message);
        break;
      
      case 'leave_chat':
        this.handleLeaveChat(clientId, message);
        break;
      
      case 'new_message':
        await this.handleNewMessage(clientId, ws, message);
        break;
      
      case 'message_read':
        await this.handleMessageRead(clientId, message);
        break;
      
      case 'ping':
        this.sendMessage(ws, { type: 'pong' });
        break;
      
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private canAccessChat(ws: AuthenticatedWebSocket, chatSession: ChatSession): boolean {
    if (!ws.userId || !ws.userType) {
      console.log('Access denied: User not authenticated');
      return false;
    }

    // Customer can only access their own chats
    if (ws.userType === 'customer') {
      const hasAccess = ws.userId === chatSession.customerId;
      if (!hasAccess) {
        console.log(`Access denied: Customer ${ws.userId} trying to access chat for customer ${chatSession.customerId}`);
      }
      return hasAccess;
    }

    // Merchant can only access chats for their shop
    if (ws.userType === 'merchant') {
      const hasAccess = ws.shopId === chatSession.shopId;
      if (!hasAccess) {
        console.log(`Access denied: Merchant ${ws.userId} trying to access chat for shop ${chatSession.shopId} (owns shop ${ws.shopId})`);
      }
      return hasAccess;
    }

    console.log(`Access denied: Unknown user type ${ws.userType}`);
    return false;
  }

  private async handleAuth(clientId: string, ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    const { userId, userType, shopId } = message;
    
    if (!userId || !userType) {
      this.sendError(ws, 'Missing authentication credentials');
      return;
    }

    // Verify user exists in database (optional - for production)
    // For now, trust the client-provided auth info

    ws.userId = userId;
    ws.userType = userType;
    ws.shopId = shopId;

    console.log(`🔐✅ AUTHENTICATED ${clientId} as ${userType} ${userId}${shopId ? ` (shop: ${shopId})` : ''}`);
    console.log(`🔐📊 TOTAL AUTHENTICATED CONNECTIONS: ${Array.from(this.clients.values()).filter(c => c.userId).length}`);
    
    this.sendMessage(ws, {
      type: 'auth_success',
      payload: { userId, userType, shopId }
    });
  }

  private async handleJoinChat(clientId: string, ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    const { chatSession } = message;
    
    if (!chatSession || !chatSession.customerId || !chatSession.shopId) {
      this.sendError(ws, 'Invalid chat session');
      return;
    }

    // Validate access permissions
    if (!this.canAccessChat(ws, chatSession)) {
      this.sendError(ws, 'Access denied: insufficient permissions for this chat');
      return;
    }

    const chatId = this.getChatId(chatSession);
    
    // Add client to chat session
    if (!this.chatSessions.has(chatId)) {
      this.chatSessions.set(chatId, new Set());
    }
    this.chatSessions.get(chatId)!.add(clientId);

    console.log(`${clientId} joined chat ${chatId}`);
    
    // Notify other participants in the chat
    this.broadcastToChat(chatId, {
      type: 'user_joined',
      payload: { 
        userId: ws.userId, 
        userType: ws.userType,
        chatSession 
      }
    }, clientId);

    this.sendMessage(ws, {
      type: 'chat_joined',
      payload: { chatSession }
    });
  }

  private handleLeaveChat(clientId: string, message: WebSocketMessage) {
    const { chatSession } = message;
    
    if (!chatSession) return;

    const chatId = this.getChatId(chatSession);
    const chatClients = this.chatSessions.get(chatId);
    
    if (chatClients) {
      chatClients.delete(clientId);
      
      if (chatClients.size === 0) {
        this.chatSessions.delete(chatId);
      } else {
        // Notify remaining participants
        this.broadcastToChat(chatId, {
          type: 'user_left',
          payload: { chatSession }
        });
      }
    }

    console.log(`${clientId} left chat ${chatId}`);
  }

  private async handleNewMessage(clientId: string, ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    const { payload } = message;
    
    if (!payload || !payload.id) {
      this.sendError(ws, 'Invalid message payload');
      return;
    }

    // Verify the message exists in database
    try {
      const dbMessage = await db.select()
        .from(schema.direct_messages)
        .where(eq(schema.direct_messages.id, payload.id))
        .limit(1);

      if (dbMessage.length === 0) {
        this.sendError(ws, 'Message not found');
        return;
      }

      const msg = dbMessage[0];
      const chatSession = {
        customerId: msg.customer_id,
        shopId: msg.shop_id,
        productId: msg.product_id || undefined
      };
      
      const chatId = this.getChatId(chatSession);

      // Broadcast to all participants in the chat
      this.broadcastToChat(chatId, {
        type: 'message_received',
        payload: msg
      });

      console.log(`Broadcasted message ${payload.id} to chat ${chatId}`);
    } catch (error) {
      console.error('Error handling new message:', error);
      this.sendError(ws, 'Failed to process message');
    }
  }

  private async handleMessageRead(clientId: string, message: WebSocketMessage) {
    const { chatSession, messageId } = message;
    
    if (!chatSession || !messageId) return;

    const chatId = this.getChatId(chatSession);
    
    // Broadcast read receipt to other participants
    this.broadcastToChat(chatId, {
      type: 'message_read_receipt',
      payload: { messageId, readBy: this.clients.get(clientId)?.userId }
    }, clientId);
  }

  private handleDisconnect(clientId: string) {
    const ws = this.clients.get(clientId);
    if (ws && ws.userId) {
      console.log(`🔌❌ DISCONNECTING AUTHENTICATED USER: ${clientId} (${ws.userType} ${ws.userId})`);
    } else {
      console.log(`🔌❌ DISCONNECTING UNAUTHENTICATED CLIENT: ${clientId}`);
    }

    // Remove from all chat sessions
    for (const [chatId, clients] of this.chatSessions.entries()) {
      if (clients.has(clientId)) {
        clients.delete(clientId);
        if (clients.size === 0) {
          this.chatSessions.delete(chatId);
        }
      }
    }

    this.clients.delete(clientId);
    
    const remainingAuthenticatedConnections = Array.from(this.clients.values()).filter(c => c.userId).length;
    console.log(`🔐📊 REMAINING AUTHENTICATED CONNECTIONS: ${remainingAuthenticatedConnections}`);
  }

  private getChatId(chatSession: ChatSession): string {
    const base = `${chatSession.customerId}:${chatSession.shopId}`;
    return chatSession.productId ? `${base}:${chatSession.productId}` : base;
  }

  private broadcastToChat(chatId: string, message: any, excludeClientId?: string) {
    const clients = this.chatSessions.get(chatId);
    if (!clients) return;

    clients.forEach(clientId => {
      if (clientId !== excludeClientId) {
        const client = this.clients.get(clientId);
        if (client && client.readyState === WebSocket.OPEN) {
          this.sendMessage(client, message);
        }
      }
    });
  }

  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.sendMessage(ws, {
      type: 'error',
      payload: { message: error }
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupHeartbeat() {
    const interval = setInterval(() => {
      this.clients.forEach((ws, clientId) => {
        if (!ws.isAlive) {
          console.log(`Terminating inactive connection: ${clientId}`);
          ws.terminate();
          this.handleDisconnect(clientId);
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Check every 30 seconds

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  // Public method to broadcast messages from API endpoints
  public broadcastMessage(customerId: string, shopId: string, productId: string | null, message: any) {
    const chatSession: ChatSession = {
      customerId,
      shopId,
      productId: productId || undefined
    };
    
    const chatId = this.getChatId(chatSession);
    
    this.broadcastToChat(chatId, {
      type: 'message_received',
      payload: message
    });
  }

  // Public method to broadcast general events to all connected clients
  public broadcastToAll(eventType: string, payload?: any) {
    const message = {
      type: eventType,
      payload,
      timestamp: Date.now()
    };

    console.log(`📡 Broadcasting ${eventType} to ${this.clients.size} clients`);
    
    this.clients.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to send broadcast to ${clientId}:`, error);
        }
      }
    });
  }

  // Broadcast to a specific user by user ID and type
  public broadcastToUser(userId: string, userType: 'customer' | 'merchant', message: any) {
    console.log(`🎯📡 BROADCAST START: Targeting ${userType} ${userId}`);
    console.log(`🎯📊 Total connections: ${this.clients.size}`);
    
    // Get all authenticated connections for summary
    const authenticatedConnections = Array.from(this.clients.values()).filter(c => c.userId);
    console.log(`🎯🔐 Authenticated connections: ${authenticatedConnections.length}`);
    
    if (authenticatedConnections.length > 0) {
      console.log(`🎯📋 AUTHENTICATED USERS LIST:`);
      authenticatedConnections.forEach((ws, index) => {
        console.log(`  ${index + 1}. userId=${ws.userId}, userType=${ws.userType}, readyState=${ws.readyState}`);
      });
    }
    
    let messagesSent = 0;
    let userIdMatches = 0;
    let typeMatches = 0;
    let openConnections = 0;
    
    this.clients.forEach((ws, clientId) => {
      const isUserIdMatch = ws.userId === userId;
      const isTypeMatch = ws.userType === userType;
      const isConnectionOpen = ws.readyState === WebSocket.OPEN;
      
      if (isUserIdMatch) {
        userIdMatches++;
        console.log(`🎯🔍 FOUND USER ID MATCH: ${clientId} (type=${ws.userType}, target=${userType}, open=${isConnectionOpen})`);
      }
      
      if (isUserIdMatch && isTypeMatch) {
        typeMatches++;
        console.log(`🎯✅ PERFECT MATCH: ${clientId} (userId=${userId}, userType=${userType})`);
        
        if (isConnectionOpen) {
          openConnections++;
          try {
            ws.send(JSON.stringify(message));
            messagesSent++;
            console.log(`🎯📤 MESSAGE SENT SUCCESSFULLY to ${clientId}`);
          } catch (error) {
            console.error(`🎯❌ SEND FAILED to ${clientId}:`, error);
          }
        } else {
          console.log(`🎯🔌 CONNECTION NOT OPEN: ${clientId} (readyState=${ws.readyState})`);
        }
      }
    });

    console.log(`🎯📊 BROADCAST RESULTS:`);
    console.log(`  - User ID matches: ${userIdMatches}`);
    console.log(`  - Type matches: ${typeMatches}`);
    console.log(`  - Open connections: ${openConnections}`);
    console.log(`  - Messages sent: ${messagesSent}`);
    
    if (messagesSent === 0) {
      console.log(`🎯🚨 BROADCAST FAILED: No messages sent to ${userType} ${userId}`);
    } else {
      console.log(`🎯🎉 BROADCAST SUCCESS: ${messagesSent} messages sent to ${userType} ${userId}`);
    }
  }

  // Broadcast to all users with a specific role
  public broadcastToRole(role: 'customer' | 'merchant' | 'admin', message: any) {
    let messagesSent = 0;
    
    this.clients.forEach((ws, clientId) => {
      if (ws.userType === role && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(message));
          messagesSent++;
        } catch (error) {
          console.error(`Failed to send message to role ${role}:`, error);
        }
      }
    });

    console.log(`📡 Sent message to ${messagesSent} ${role} connections`);
  }

  // Broadcast to all merchants of a specific shop
  public broadcastToShop(shopId: string, message: any) {
    let messagesSent = 0;
    
    this.clients.forEach((ws, clientId) => {
      if (ws.shopId === shopId && ws.userType === 'merchant' && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(message));
          messagesSent++;
        } catch (error) {
          console.error(`Failed to send message to shop ${shopId}:`, error);
        }
      }
    });

    console.log(`📡 Sent message to ${messagesSent} merchant connections for shop ${shopId}`);
  }

  public getStats() {
    return {
      totalConnections: this.clients.size,
      activeChatSessions: this.chatSessions.size,
      chatSessions: Array.from(this.chatSessions.entries()).map(([chatId, clients]) => ({
        chatId,
        participantCount: clients.size
      }))
    };
  }
}

// Export singleton instance
let websocketManager: WebSocketManager | null = null;

export function initializeWebSocket(server: Server): WebSocketManager {
  if (!websocketManager) {
    websocketManager = new WebSocketManager(server);
    console.log('WebSocket server initialized');
  }
  return websocketManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return websocketManager;
}