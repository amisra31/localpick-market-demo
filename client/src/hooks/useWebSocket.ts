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

interface UseWebSocketOptions {
  onMessage?: (message: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { user, isAuthenticated } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 3000
  } = options;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    console.log('Attempting WebSocket connection...');
    setIsConnecting(true);
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    console.log('Current location:', window.location.host);
    
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnecting(false);
      onError?.(error as Event);
      return;
    }

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setIsConnecting(false);
      
      // Authenticate if user is logged in
      if (isAuthenticated && user) {
        const authMessage: WebSocketMessage = {
          type: 'auth',
          userId: user.id,
          userType: user.role === 'merchant' ? 'merchant' : 'customer',
          shopId: user.shop_id
        };
        
        ws.send(JSON.stringify(authMessage));
      }
      
      onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        onMessage?.(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      setIsConnected(false);
      setIsConnecting(false);
      wsRef.current = null;
      
      onDisconnect?.();

      // Auto-reconnect if enabled and connection was not intentionally closed
      if (autoReconnect && event.code !== 1000) {
        console.log(`Reconnecting in ${reconnectInterval}ms...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnecting(false);
      onError?.(error);
    };
  }, [isAuthenticated, user, onMessage, onConnect, onDisconnect, onError, autoReconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Intentional disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket not connected. Message not sent:', message);
      return false;
    }
  }, []);

  const joinChat = useCallback((customerId: string, shopId: string, productId?: string) => {
    return sendMessage({
      type: 'join_chat',
      chatSession: { customerId, shopId, productId }
    });
  }, [sendMessage]);

  const leaveChat = useCallback((customerId: string, shopId: string, productId?: string) => {
    return sendMessage({
      type: 'leave_chat',
      chatSession: { customerId, shopId, productId }
    });
  }, [sendMessage]);

  const markMessageRead = useCallback((messageId: string, customerId: string, shopId: string, productId?: string) => {
    return sendMessage({
      type: 'message_read',
      messageId,
      chatSession: { customerId, shopId, productId }
    });
  }, [sendMessage]);

  // Connect on mount and when user authentication changes
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendMessage,
    joinChat,
    leaveChat,
    markMessageRead
  };
};