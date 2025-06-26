import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DirectMessage } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { enhancedDataService } from '@/services/enhancedDataService';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';
import { toast } from '@/hooks/use-toast';
import { Send, User, Store, Loader2, ArrowLeft } from 'lucide-react';

interface CustomerChatInterfaceProps {
  shopId: string;
  shopName: string;
  onBack?: () => void;
}

export const CustomerChatInterface: React.FC<CustomerChatInterfaceProps> = ({
  shopId,
  shopName,
  onBack
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket connection for real-time messaging
  const {
    isConnected,
    joinChat,
    leaveChat
  } = useChatWebSocket({
    enabled: true,
    onMessage: (message) => {
      console.log('📨 Customer received WebSocket message:', message);
      
      if (message.type === 'message_received') {
        const newMsg = message.payload;
        
        // Check if this message belongs to our chat
        if (newMsg.shop_id === shopId && newMsg.customer_id === user?.id) {
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
      console.log('✅ Customer WebSocket connected');
    },
    onDisconnect: () => {
      console.log('🔌 Customer WebSocket disconnected');
    },
    onError: (error) => {
      console.error('❌ Customer WebSocket error:', error);
    }
  });

  useEffect(() => {
    if (user) {
      loadMessages();
      
      // Join the chat session
      if (isConnected) {
        joinChat(user.id, shopId);
      }
    }
    
    // Leave chat when component unmounts or shop changes
    return () => {
      if (user && isConnected) {
        leaveChat(user.id, shopId);
      }
    };
  }, [shopId, user, isConnected]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const messagesData = await enhancedDataService.getDirectMessages(user.id, shopId);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    // Create optimistic message for immediate UI feedback
    const optimisticMessage: DirectMessage = {
      id: `temp_${Date.now()}`,
      customer_id: user.id,
      shop_id: shopId,
      product_id: undefined,
      sender_id: user.id,
      sender_type: 'customer',
      message: messageContent,
      is_read: false,
      created_at: Date.now()
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setTimeout(scrollToBottom, 100);

    try {
      const serverMessage = await enhancedDataService.sendDirectMessage(
        user.id,
        shopId,
        'customer',
        messageContent
      );
      
      // Replace optimistic message with server message
      setMessages(prev => prev.map(msg => 
        msg.id === optimisticMessage.id ? serverMessage : msg
      ));
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
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Store className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="font-medium">{shopName}</h3>
            <p className="text-sm text-gray-500">
              {isConnected ? 'Connected' : 'Connecting...'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2 text-gray-500">Loading messages...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isFromCustomer = message.sender_type === 'customer';
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isFromCustomer ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      isFromCustomer
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
                        {isFromCustomer ? 'You' : shopName}
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
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isSending || !isConnected}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending || !isConnected}
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
      </div>
    </div>
  );
};