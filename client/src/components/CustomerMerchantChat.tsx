import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { DirectMessage, Product, Shop } from '@/types';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Send, X, Store, User, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';

interface CustomerMerchantChatProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  shop: Shop;
  customerId?: string; // For guest users, we'll generate a temp ID
  customerName?: string; // For guest users
}

export const CustomerMerchantChat: React.FC<CustomerMerchantChatProps> = ({
  isOpen,
  onClose,
  product,
  shop,
  customerId,
  customerName
}) => {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine current user details - use stable guest ID
  const currentUserId = useMemo(() => {
    return customerId || user?.id || `guest_${Date.now()}`;
  }, [customerId, user?.id]);
  
  const currentUserName = customerName || user?.name || 'Guest User';
  const isCustomer = !user || user.role === 'user';

  // WebSocket connection for real-time messaging
  const {
    isConnected,
    isConnecting,
    connectionError,
    joinChat,
    leaveChat,
    markMessageRead
  } = useChatWebSocket({
    enabled: true, // Always keep WebSocket connection active
    onMessage: (message) => {
      console.log('📨 Received WebSocket message:', message);
      
      if (message.type === 'message_received') {
        const newMsg = message.payload;
        // Only add message if it belongs to this chat session
        if (newMsg.customer_id === currentUserId && newMsg.shop_id === shop.id) {
          setMessages(prev => {
            // Avoid duplicates
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) return prev;
            return [...prev, newMsg];
          });
          setTimeout(scrollToBottom, 100);
        }
      }
    },
    onConnect: () => {
      console.log('✅ Chat WebSocket connected');
      if (isOpen && shop.id) {
        joinChat(currentUserId, shop.id, product?.id);
      }
    },
    onDisconnect: () => {
      console.log('🔌 Chat WebSocket disconnected');
    },
    onError: (error) => {
      console.error('❌ Chat WebSocket error:', error);
    }
  });

  useEffect(() => {
    if (isOpen && shop.id) {
      loadMessages();
      markMessagesAsRead();
      
      // Join chat session when WebSocket is connected
      if (isConnected) {
        joinChat(currentUserId, shop.id, product?.id);
      }
    }
    
    // Leave chat when dialog closes
    return () => {
      if (isOpen && shop.id && isConnected) {
        leaveChat(currentUserId, shop.id, product?.id);
      }
    };
  }, [isOpen, shop.id, currentUserId, isConnected]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!shop.id) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        customer_id: currentUserId,
        shop_id: shop.id
      });
      
      if (product?.id) {
        params.append('product_id', product.id);
      }

      const response = await fetch(`/api/messages?${params}`);
      if (response.ok) {
        const messagesData = await response.json();
        setMessages(messagesData);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!shop.id) return;
    
    try {
      await fetch('/api/messages/mark-read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: currentUserId,
          shop_id: shop.id,
          reader_id: currentUserId
        })
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !shop.id || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    // Create optimistic message for immediate UI feedback
    const optimisticMessage: DirectMessage = {
      id: `temp_${Date.now()}`,
      customer_id: currentUserId,
      shop_id: shop.id,
      product_id: product?.id,
      sender_id: currentUserId,
      sender_type: 'customer',
      message: messageContent,
      is_read: false,
      created_at: Date.now()
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setTimeout(scrollToBottom, 100);

    try {
      const messageData = {
        customer_id: currentUserId,
        shop_id: shop.id,
        product_id: product?.id,
        sender_id: currentUserId,
        sender_type: 'customer' as const,
        message: messageContent
      };

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      if (response.ok) {
        const serverMessage = await response.json();
        
        // Replace optimistic message with server message
        setMessages(prev => prev.map(msg => 
          msg.id === optimisticMessage.id ? serverMessage : msg
        ));
        
        // Note: WebSocket will also broadcast this message, but our duplicate 
        // prevention in the WebSocket handler will prevent double-adding
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 7 * 24) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Chat with {shop.name}
            </div>
            
            {/* Connection Status Indicator - Only show when connected */}
            {isConnected && (
              <div className="flex items-center gap-1">
                <Wifi className="w-4 h-4 text-green-500" />
                <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                  Live
                </Badge>
              </div>
            )}
          </DialogTitle>
          {product && (
            <div className="text-sm text-gray-600 mt-1">
              About: {product.name}
            </div>
          )}
        </DialogHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2 text-gray-500">Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-center">No messages yet</p>
              <p className="text-sm text-center">Start a conversation with the merchant!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === currentUserId;
                const isFromCustomer = message.sender_type === 'customer';
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        {isFromCustomer ? (
                          <User className="w-3 h-3" />
                        ) : (
                          <Store className="w-3 h-3" />
                        )}
                        <span className="text-xs opacity-75">
                          {isFromCustomer ? 'Customer' : shop.name}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      <div className="text-xs opacity-75 mt-1">
                        {formatMessageTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isSending}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending}
              size="sm"
              className="px-3"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {!isAuthenticated && (
            <p className="text-xs text-gray-500 mt-2">
              💡 Sign up to save your conversation history
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};