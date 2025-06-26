import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChatWebSocket } from './useChatWebSocket';

export interface ChatMessage {
  id: string;
  message: string;
  sender_type: 'customer' | 'merchant';
  is_read: boolean;
  created_at: number;
}

export interface ChatThread {
  shop_id: string;
  shop_name: string;
  shop_category: string;
  last_message: {
    id: string;
    message: string;
    sender_type: 'customer' | 'merchant';
    created_at: number;
  };
  unread_count: number;
  last_activity: number;
  messages: ChatMessage[];
}

export const useChatThreads = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket connection for real-time updates
  const { isConnected } = useChatWebSocket({
    enabled: true,
    onMessage: (message) => {
      if (message.type === 'message_received') {
        const newMsg = message.payload;
        
        // Update the appropriate thread with new message
        setThreads(prev => 
          prev.map(thread => {
            if (thread.shop_id === newMsg.shop_id) {
              // Check if message already exists to avoid duplicates
              const exists = thread.messages.some(m => m.id === newMsg.id);
              if (exists) return thread;
              
              return {
                ...thread,
                last_message: {
                  id: newMsg.id,
                  message: newMsg.message,
                  sender_type: newMsg.sender_type,
                  created_at: newMsg.created_at
                },
                last_activity: newMsg.created_at,
                messages: [...thread.messages, newMsg]
              };
            }
            return thread;
          })
        );
      }
    },
    onConnect: () => {
      console.log('✅ Chat threads WebSocket connected');
    },
    onDisconnect: () => {
      console.log('🔌 Chat threads WebSocket disconnected');
    },
    onError: (error) => {
      console.error('❌ Chat threads WebSocket error:', error);
    }
  });

  const fetchThreads = async () => {
    if (!user) {
      setThreads([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/chat/threads?user_id=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('localpick_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Sort messages within each thread by created_at to maintain chronological order
        const sortedData = data.map((thread: ChatThread) => ({
          ...thread,
          messages: (thread.messages || []).sort((a, b) => a.created_at - b.created_at)
        }));
        setThreads(sortedData);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch chat threads');
      }
    } catch (err) {
      console.error('Error fetching chat threads:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTotalUnreadCount = () => {
    return threads.reduce((total, thread) => total + thread.unread_count, 0);
  };

  const markThreadAsRead = async (shopId: string) => {
    if (!user) return;

    try {
      await fetch('/api/messages/mark-read', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('localpick_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: user.id,
          shop_id: shopId,
          reader_id: user.id
        })
      });

      // Update local state
      setThreads(prev => 
        prev.map(thread => 
          thread.shop_id === shopId 
            ? { ...thread, unread_count: 0 }
            : thread
        )
      );
    } catch (error) {
      console.error('Error marking thread as read:', error);
    }
  };

  const sendMessage = async (shopId: string, message: string, productId?: string) => {
    if (!user || !message.trim()) return null;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('localpick_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: user.id,
          shop_id: shopId,
          product_id: productId,
          sender_id: user.id,
          sender_type: 'customer',
          message: message.trim()
        })
      });

      if (response.ok) {
        const newMessage = await response.json();
        
        // Update threads with new message
        setThreads(prev => 
          prev.map(thread => {
            if (thread.shop_id === shopId) {
              return {
                ...thread,
                last_message: {
                  id: newMessage.id,
                  message: newMessage.message,
                  sender_type: newMessage.sender_type,
                  created_at: newMessage.created_at
                },
                last_activity: newMessage.created_at,
                messages: [...thread.messages, newMessage]
              };
            }
            return thread;
          })
        );

        return newMessage;
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
    
    return null;
  };

  useEffect(() => {
    fetchThreads();
  }, [user]);

  return {
    threads,
    loading,
    error,
    fetchThreads,
    getTotalUnreadCount,
    markThreadAsRead,
    sendMessage
  };
};