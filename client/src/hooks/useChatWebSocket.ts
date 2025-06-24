import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface WebSocketMessage {
  type: string;
  payload?: any;
  chatSession?: {
    customerId: string;
    shopId: string;
    productId?: string;
  };
  messageId?: string;
  userId?: string;
  userType?: 'customer' | 'merchant';
  shopId?: string;
}

interface UseChatWebSocketOptions {
  onMessage?: (message: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  enabled?: boolean; // Only connect when enabled
}

// Singleton WebSocket manager to avoid multiple connections
class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  private ws: WebSocket | null = null;
  private subscribers: Set<(message: any) => void> = new Set();
  private connectionPromise: Promise<void> | null = null;
  private isConnecting = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  async connect(user: any): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket already connected');
      return Promise.resolve();
    }

    if (this.isConnecting && this.connectionPromise) {
      console.log('🔌 WebSocket connection in progress, waiting...');
      return this.connectionPromise;
    }

    console.log('🔌 Initiating WebSocket connection...');
    this.isConnecting = true;

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log('🔗 Connecting to WebSocket:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected successfully');
          this.isConnecting = false;
          
          // Authenticate if user is available
          if (user) {
            const authMessage: WebSocketMessage = {
              type: 'auth',
              userId: user.id,
              userType: user.role === 'merchant' ? 'merchant' : 'customer',
              shopId: user.shop_id
            };
            
            this.send(authMessage);
            console.log('🔐 Authentication sent:', authMessage);
          }
          
          this.notifySubscribers({ type: 'connection_established' });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 WebSocket message received:', message);
            this.notifySubscribers(message);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.ws = null;
          this.connectionPromise = null;
          
          this.notifySubscribers({ type: 'disconnected', code: event.code, reason: event.reason });
          
          // Auto-reconnect if not intentionally closed
          if (event.code !== 1000 && this.subscribers.size > 0) {
            console.log('🔄 Scheduling reconnection in 3 seconds...');
            this.reconnectTimeout = setTimeout(() => {
              if (user) {
                this.connect(user);
              }
            }, 3000);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.isConnecting = false;
          this.notifySubscribers({ type: 'error', error });
          reject(error);
        };

      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        this.isConnecting = false;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  disconnect() {
    console.log('🔌 Disconnecting WebSocket...');
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Intentional disconnect');
      this.ws = null;
    }
    
    this.isConnecting = false;
    this.connectionPromise = null;
  }

  send(message: WebSocketMessage): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('📤 Sending WebSocket message:', message);
      this.ws.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('⚠️ WebSocket not connected. Message not sent:', message);
      return false;
    }
  }

  subscribe(callback: (message: any) => void): () => void {
    this.subscribers.add(callback);
    console.log('🎧 WebSocket subscriber added. Total subscribers:', this.subscribers.size);
    
    return () => {
      this.subscribers.delete(callback);
      console.log('🎧 WebSocket subscriber removed. Total subscribers:', this.subscribers.size);
      
      // Disconnect if no more subscribers
      if (this.subscribers.size === 0) {
        console.log('🔌 No more subscribers, disconnecting WebSocket');
        this.disconnect();
      }
    };
  }

  private notifySubscribers(message: any) {
    this.subscribers.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('❌ Error in WebSocket subscriber:', error);
      }
    });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): number | null {
    return this.ws?.readyState ?? null;
  }
}

export const useChatWebSocket = (options: UseChatWebSocketOptions = {}) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Debounced state updates to prevent UI flickering
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedSetConnected = useCallback((connected: boolean) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      setIsConnected(connected);
    }, 500); // Increased to 500ms to reduce flickering
  }, []);
  
  const debouncedSetConnecting = useCallback((connecting: boolean) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      setIsConnecting(connecting);
    }, 300); // Increased to 300ms to reduce flickering
  }, []);
  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    enabled = false
  } = options;

  // Handle WebSocket messages
  const handleMessage = useCallback((message: any) => {
    console.log('🎯 Processing WebSocket message:', message);

    switch (message.type) {
      case 'connection_established':
        debouncedSetConnected(true);
        debouncedSetConnecting(false);
        setConnectionError(null);
        onConnect?.();
        break;
        
      case 'auth_success':
        console.log('🔐 Authentication successful');
        break;
        
      case 'disconnected':
        debouncedSetConnected(false);
        debouncedSetConnecting(false);
        onDisconnect?.();
        break;
        
      case 'error':
        debouncedSetConnecting(false);
        onError?.(message.error);
        break;
        
      default:
        onMessage?.(message);
        break;
    }
  }, [onMessage, onConnect, onDisconnect, onError]);

  // Connect when enabled
  useEffect(() => {
    if (!enabled) {
      console.log('🚫 WebSocket disabled, not connecting');
      return;
    }

    console.log('🎯 WebSocket enabled, attempting connection...');
    
    const wsManager = WebSocketManager.getInstance();
    wsManagerRef.current = wsManager;
    
    // Subscribe to messages
    const unsubscribe = wsManager.subscribe(handleMessage);
    unsubscribeRef.current = unsubscribe;

    // Connect if authenticated
    if (isAuthenticated && user) {
      debouncedSetConnecting(true);
      setConnectionError(null);
      
      wsManager.connect(user).catch(error => {
        console.error('❌ Failed to connect WebSocket:', error);
        // Don't set connection error immediately to prevent flickering
        debouncedSetConnecting(false);
      });
    }

    return () => {
      console.log('🧹 Cleaning up WebSocket subscription');
      unsubscribe();
    };
  }, [enabled, isAuthenticated, user, handleMessage]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage): boolean => {
    const wsManager = wsManagerRef.current;
    if (!wsManager) {
      console.warn('⚠️ WebSocket manager not initialized');
      return false;
    }

    const success = wsManager.send(message);
    console.log('📤 Message send result:', success);
    return success;
  }, []);

  const joinChat = useCallback((customerId: string, shopId: string, productId?: string) => {
    console.log('🏠 Joining chat:', { customerId, shopId, productId });
    return sendMessage({
      type: 'join_chat',
      chatSession: { customerId, shopId, productId }
    });
  }, [sendMessage]);

  const leaveChat = useCallback((customerId: string, shopId: string, productId?: string) => {
    console.log('🚪 Leaving chat:', { customerId, shopId, productId });
    return sendMessage({
      type: 'leave_chat',
      chatSession: { customerId, shopId, productId }
    });
  }, [sendMessage]);

  const markMessageRead = useCallback((messageId: string, customerId: string, shopId: string, productId?: string) => {
    console.log('✅ Marking message as read:', messageId);
    return sendMessage({
      type: 'message_read',
      messageId,
      chatSession: { customerId, shopId, productId }
    });
  }, [sendMessage]);

  const forceReconnect = useCallback(() => {
    const wsManager = wsManagerRef.current;
    if (wsManager && isAuthenticated && user) {
      console.log('🔄 Force reconnecting WebSocket...');
      debouncedSetConnecting(true);
      setConnectionError(null);
      
      wsManager.disconnect();
      wsManager.connect(user).catch(error => {
        console.error('❌ Force reconnect failed:', error);
        debouncedSetConnecting(false);
      });
    }
  }, [isAuthenticated, user, debouncedSetConnecting]);

  return {
    isConnected,
    isConnecting,
    connectionError,
    sendMessage,
    joinChat,
    leaveChat,
    markMessageRead,
    forceReconnect
  };
};