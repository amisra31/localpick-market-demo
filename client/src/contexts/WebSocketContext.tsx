import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

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

interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  showReconnectBanner: boolean;
  sendMessage: (message: WebSocketMessage) => Promise<boolean>;
  subscribe: (callback: (message: any) => void) => () => void;
  joinChat: (customerId: string, shopId: string, productId?: string) => Promise<boolean>;
  leaveChat: (customerId: string, shopId: string, productId?: string) => Promise<boolean>;
  markMessageRead: (messageId: string, customerId: string, shopId: string, productId?: string) => Promise<boolean>;
  forceReconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showReconnectBanner, setShowReconnectBanner] = useState(false);
  
  const ws = useRef<WebSocket | null>(null);
  const subscribers = useRef<Set<(message: any) => void>>(new Set());
  const connectionPromise = useRef<Promise<void> | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const bannerTimeout = useRef<NodeJS.Timeout | null>(null);
  const stableDisconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastDisconnectTime = useRef<number>(0);
  const reconnectAttempts = useRef<number>(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 3000;

  // Debounced state updates to prevent UI flickering
  const debouncedStateUpdate = useCallback((updates: Partial<{
    isConnected: boolean;
    isConnecting: boolean;
    connectionError: string | null;
  }>) => {
    setTimeout(() => {
      if (updates.isConnected !== undefined) setIsConnected(updates.isConnected);
      if (updates.isConnecting !== undefined) setIsConnecting(updates.isConnecting);
      if (updates.connectionError !== undefined) setConnectionError(updates.connectionError);
    }, 100);
  }, []);

  const clearTimeouts = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    if (bannerTimeout.current) {
      clearTimeout(bannerTimeout.current);
      bannerTimeout.current = null;
    }
    if (stableDisconnectTimeout.current) {
      clearTimeout(stableDisconnectTimeout.current);
      stableDisconnectTimeout.current = null;
    }
  };

  const notifySubscribers = (message: any) => {
    subscribers.current.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('❌ Error in WebSocket subscriber:', error);
      }
    });
  };

  const connect = async (): Promise<void> => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (isConnecting && connectionPromise.current) {
      return connectionPromise.current;
    }

    setIsConnecting(true);
    setConnectionError(null);

    connectionPromise.current = new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          console.log('✅ WebSocket connected');
          reconnectAttempts.current = 0;
          clearTimeouts();
          
          debouncedStateUpdate({
            isConnected: true,
            isConnecting: false,
            connectionError: null
          });
          
          setShowReconnectBanner(false);
          
          // Authenticate if user is available
          if (user && isAuthenticated) {
            const authMessage: WebSocketMessage = {
              type: 'auth',
              userId: user.id,
              userType: user.role === 'merchant' ? 'merchant' : 'customer',
              shopId: user.shop_id
            };
            
            ws.current?.send(JSON.stringify(authMessage));
          }
          
          notifySubscribers({ type: 'connection_established' });
          resolve();
        };

        ws.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            notifySubscribers(message);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        ws.current.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          
          ws.current = null;
          connectionPromise.current = null;
          lastDisconnectTime.current = Date.now();
          
          debouncedStateUpdate({
            isConnected: false,
            isConnecting: false
          });
          
          notifySubscribers({ type: 'disconnected', code: event.code, reason: event.reason });
          
          // Only show reconnect banner after stable disconnect (5+ seconds)
          if (event.code !== 1000 && subscribers.current.size > 0) {
            stableDisconnectTimeout.current = setTimeout(() => {
              setShowReconnectBanner(true);
            }, 5000);
            
            // Auto-reconnect with exponential backoff
            const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempts.current), 30000);
            reconnectAttempts.current++;
            
            if (reconnectAttempts.current <= maxReconnectAttempts) {
              reconnectTimeout.current = setTimeout(() => {
                if (isAuthenticated && user) {
                  connect().catch(console.error);
                }
              }, delay);
            } else {
              setConnectionError('Failed to reconnect after multiple attempts');
            }
          }
        };

        ws.current.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          debouncedStateUpdate({
            isConnecting: false,
            connectionError: 'Connection failed'
          });
          notifySubscribers({ type: 'error', error });
          reject(error);
        };

      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        debouncedStateUpdate({
          isConnecting: false,
          connectionError: 'Failed to create connection'
        });
        reject(error);
      }
    });

    return connectionPromise.current;
  };

  const disconnect = () => {
    clearTimeouts();
    
    if (ws.current) {
      ws.current.close(1000, 'Intentional disconnect');
      ws.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionError(null);
    setShowReconnectBanner(false);
    connectionPromise.current = null;
    reconnectAttempts.current = 0;
  };

  const sendMessage = useCallback(async (message: WebSocketMessage): Promise<boolean> => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('❌ Error sending message:', error);
        return false;
      }
    }
    
    // Try to reconnect if not connected
    if (!isConnected && !isConnecting) {
      try {
        await connect();
        // Retry sending after connection
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify(message));
          return true;
        }
      } catch (error) {
        console.error('❌ Failed to reconnect and send message:', error);
      }
    }
    
    return false;
  }, [isConnected, isConnecting]);

  const subscribe = useCallback((callback: (message: any) => void): () => void => {
    subscribers.current.add(callback);
    
    // Auto-connect when first subscriber is added
    if (subscribers.current.size === 1 && isAuthenticated && user) {
      connect().catch(console.error);
    }
    
    return () => {
      subscribers.current.delete(callback);
      
      // Auto-disconnect when no more subscribers
      if (subscribers.current.size === 0) {
        disconnect();
      }
    };
  }, [isAuthenticated, user]);

  const joinChat = useCallback(async (customerId: string, shopId: string, productId?: string): Promise<boolean> => {
    return sendMessage({
      type: 'join_chat',
      chatSession: { customerId, shopId, productId }
    });
  }, [sendMessage]);

  const leaveChat = useCallback(async (customerId: string, shopId: string, productId?: string): Promise<boolean> => {
    return sendMessage({
      type: 'leave_chat',
      chatSession: { customerId, shopId, productId }
    });
  }, [sendMessage]);

  const markMessageRead = useCallback(async (messageId: string, customerId: string, shopId: string, productId?: string): Promise<boolean> => {
    return sendMessage({
      type: 'message_read',
      messageId,
      chatSession: { customerId, shopId, productId }
    });
  }, [sendMessage]);

  const forceReconnect = useCallback(() => {
    if (isAuthenticated && user) {
      reconnectAttempts.current = 0;
      setConnectionError(null);
      setShowReconnectBanner(false);
      disconnect();
      connect().catch(console.error);
    }
  }, [isAuthenticated, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
      disconnect();
    };
  }, []);

  const value: WebSocketContextType = {
    isConnected,
    isConnecting,
    connectionError,
    showReconnectBanner,
    sendMessage,
    subscribe,
    joinChat,
    leaveChat,
    markMessageRead,
    forceReconnect
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};