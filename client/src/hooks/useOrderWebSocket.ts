import { useEffect } from 'react';
import { useChatWebSocket } from './useChatWebSocket';
import { useAuth } from '@/contexts/AuthContext';

interface OrderUpdatePayload {
  orderId: string;
  customerId: string;
  shopId: string;
  previousStatus: string;
  newStatus: string;
  order: any;
  product: any;
  shop: any;
  timestamp: number;
}

interface UseOrderWebSocketProps {
  onOrderStatusUpdate?: (payload: OrderUpdatePayload) => void;
  enabled?: boolean;
}

/**
 * Hook for real-time order status updates via WebSocket
 * Integrates with the existing chat WebSocket infrastructure
 */
export const useOrderWebSocket = ({
  onOrderStatusUpdate,
  enabled = true
}: UseOrderWebSocketProps = {}) => {
  const { user } = useAuth();

  console.log('🔄⚡ ORDER WEBSOCKET INITIALIZED:', {
    enabled,
    hasUser: !!user,
    userRole: user?.role,
    userId: user?.id,
    timestamp: new Date().toISOString()
  });

  const { isConnected, connectionStatus } = useChatWebSocket({
    enabled: enabled && !!user,
    onMessage: (message) => {
      console.log('📨⚡ WEBSOCKET MESSAGE RECEIVED:', {
        type: message.type,
        isOrderUpdate: message.type === 'order_status_updated',
        hasCallback: !!onOrderStatusUpdate,
        messageId: message.messageId || 'no-id',
        timestamp: new Date().toISOString()
      });
      
      if (message.type === 'order_status_updated') {
        console.log('📦⚡ ORDER STATUS UPDATE MESSAGE:', {
          fullMessage: message,
          payload: message.payload,
          hasCallback: !!onOrderStatusUpdate
        });
        
        if (onOrderStatusUpdate) {
          const payload = message.payload as OrderUpdatePayload;
          console.log(`📦✅ PROCESSING ORDER UPDATE: ${payload.orderId} (${payload.previousStatus} → ${payload.newStatus})`);
          onOrderStatusUpdate(payload);
        } else {
          console.log('📦❌ NO CALLBACK PROVIDED FOR ORDER UPDATE');
        }
      } else {
        console.log(`📨ℹ️  NON-ORDER MESSAGE: ${message.type}`);
      }
    },
    onConnect: () => {
      console.log('✅⚡ ORDER WEBSOCKET CONNECTED');
    },
    onDisconnect: () => {
      console.log('🔌⚡ ORDER WEBSOCKET DISCONNECTED');
    },
    onError: (error) => {
      console.error('❌⚡ ORDER WEBSOCKET ERROR:', error);
    }
  });

  return {
    isConnected,
    connectionStatus
  };
};

/**
 * Hook specifically for merchant order management
 * Filters order updates for the merchant's shop
 */
export const useMerchantOrderSync = (
  shopId: string | null,
  onOrderUpdate: (order: any) => void
) => {
  const { user } = useAuth();

  return useOrderWebSocket({
    enabled: !!user && user.role === 'merchant' && !!shopId,
    onOrderStatusUpdate: (payload) => {
      // Only process updates for this merchant's shop
      if (shopId && payload.shopId === shopId) {
        console.log(`🏪 Merchant shop ${shopId} received order update for order ${payload.orderId}`);
        onOrderUpdate(payload.order);
      }
    }
  });
};

/**
 * Hook specifically for customer order tracking
 * Filters order updates for the customer's orders
 */
export const useCustomerOrderSync = (
  onOrderUpdate: (order: any) => void
) => {
  const { user } = useAuth();

  return useOrderWebSocket({
    enabled: !!user && (user.role === 'user' || user.role === 'customer'), // customers can have either role
    onOrderStatusUpdate: (payload) => {
      console.log(`👤⚡ CUSTOMER ORDER SYNC: Checking payload for user ${user?.id}`, {
        payloadCustomerId: payload.customerId,
        currentUserId: user?.id,
        userRole: user?.role,
        orderId: payload.orderId
      });
      
      // Only process updates for this customer's orders
      if (user?.id && payload.customerId === user.id) {
        console.log(`👤✅ CUSTOMER MATCH: User ${user.id} received order update for order ${payload.orderId}`);
        onOrderUpdate(payload.order);
      } else {
        console.log(`👤❌ CUSTOMER MISMATCH: Order ${payload.orderId} not for user ${user?.id} (target: ${payload.customerId})`);
      }
    }
  });
};

/**
 * Hook for admin order monitoring
 * Receives all order updates for admin dashboard
 */
export const useAdminOrderSync = (
  onOrderUpdate: (payload: OrderUpdatePayload) => void
) => {
  const { user } = useAuth();

  return useOrderWebSocket({
    enabled: !!user && user.role === 'admin',
    onOrderStatusUpdate: (payload) => {
      console.log(`👑 Admin received order update for order ${payload.orderId}`);
      onOrderUpdate(payload);
    }
  });
};