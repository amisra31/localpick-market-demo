import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DirectMessage, Shop, Product } from '@/types';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Send, X, User, Store, Loader2, Search, Users, Clock, Wifi, WifiOff } from 'lucide-react';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';
import { enhancedDataService } from '@/services/enhancedDataService';
import { userShopService } from '@/services/userShopService';

interface CustomerConversation {
  customer_id: string;
  customer_name: string;
  last_message?: DirectMessage;
  unread_count: number;
  last_activity: number;
}

interface MerchantChatInterfaceProps {
  shop: Shop;
}

export const MerchantChatInterface: React.FC<MerchantChatInterfaceProps> = ({
  shop
}) => {
  const [conversations, setConversations] = useState<CustomerConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<CustomerConversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket connection for real-time messaging
  const {
    isConnected,
    isConnecting,
    connectionError,
    joinChat,
    leaveChat,
    markMessageRead
  } = useChatWebSocket({
    enabled: true,
    onMessage: (message) => {
      console.log('📨 Merchant received WebSocket message:', message);
      
      if (message.type === 'message_received') {
        const newMsg = message.payload;
        
        // Check if this message belongs to our shop
        if (newMsg.shop_id === shop.id) {
          // Update the conversation list
          loadConversations();
          
          // If this message is for the currently selected conversation, add it
          if (selectedConversation && newMsg.customer_id === selectedConversation.customer_id) {
            setMessages(prev => {
              // Avoid duplicates
              const exists = prev.some(m => m.id === newMsg.id);
              if (exists) return prev;
              return [...prev, newMsg];
            });
            setTimeout(scrollToBottom, 100);
          }
        }
      }
    },
    onConnect: () => {
      console.log('✅ Merchant WebSocket connected');
      loadConversations();
    },
    onDisconnect: () => {
      console.log('🔌 Merchant WebSocket disconnected');
    },
    onError: (error) => {
      console.error('❌ Merchant WebSocket error:', error);
    }
  });

  useEffect(() => {
    loadConversations();
  }, [shop.id]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.customer_id);
      markMessagesAsRead(selectedConversation.customer_id);
      
      // Join the chat session for this customer
      if (isConnected) {
        joinChat(selectedConversation.customer_id, shop.id);
      }
    }
    
    // Leave previous chat when conversation changes
    return () => {
      if (selectedConversation && isConnected) {
        leaveChat(selectedConversation.customer_id, shop.id);
      }
    };
  }, [selectedConversation, isConnected]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const conversations = await enhancedDataService.getShopDirectConversations(shop.id);
      setConversations(conversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (customerId: string) => {
    setIsLoading(true);
    try {
      const messagesData = await enhancedDataService.getDirectMessages(customerId, shop.id);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markMessagesAsRead = async (customerId: string) => {
    try {
      const merchantId = userShopService.getCurrentMerchantId();
      if (!merchantId) {
        console.error('No merchant ID available for marking messages as read');
        return;
      }

      await fetch('/api/messages/mark-read', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...userShopService.getAuthHeaders()
        },
        body: JSON.stringify({
          customer_id: customerId,
          shop_id: shop.id,
          reader_id: merchantId
        })
      });
      
      // Update conversation unread count
      setConversations(prev => prev.map(conv => 
        conv.customer_id === customerId 
          ? { ...conv, unread_count: 0 }
          : conv
      ));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    const messageContent = newMessage.trim();
    const merchantId = userShopService.getCurrentMerchantId();
    
    if (!merchantId) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive'
      });
      return;
    }

    setNewMessage('');
    setIsSending(true);

    // Create optimistic message for immediate UI feedback
    const optimisticMessage: DirectMessage = {
      id: `temp_${Date.now()}`,
      customer_id: selectedConversation.customer_id,
      shop_id: shop.id,
      product_id: undefined,
      sender_id: merchantId,
      sender_type: 'merchant',
      message: messageContent,
      is_read: false,
      created_at: Date.now()
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setTimeout(scrollToBottom, 100);

    try {
      const serverMessage = await enhancedDataService.sendDirectMessage(
        selectedConversation.customer_id,
        shop.id,
        'merchant',
        messageContent
      );
      
      // Replace optimistic message with server message
      setMessages(prev => prev.map(msg => 
        msg.id === optimisticMessage.id ? serverMessage : msg
      ));
      
      // Update conversation with latest message
      setConversations(prev => prev.map(conv => 
        conv.customer_id === selectedConversation.customer_id
          ? { ...conv, last_message: serverMessage, last_activity: serverMessage.created_at }
          : conv
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

  const filteredConversations = conversations.filter(conv =>
    conv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.last_message?.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Customer Conversations
            {totalUnreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalUnreadCount} unread
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {conversations.length} conversations
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Real-time messaging
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-white rounded-lg border">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <ScrollArea className="h-[520px]">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm">Customers will appear here when they message you</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.customer_id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedConversation?.customer_id === conversation.customer_id
                        ? 'bg-blue-50 border-blue-200 border'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-sm">
                          {conversation.customer_name}
                        </span>
                      </div>
                      {conversation.unread_count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                    {conversation.last_message && (
                      <div>
                        <p className="text-xs text-gray-600 truncate">
                          {conversation.last_message.sender_type === 'merchant' ? 'You: ' : ''}
                          {conversation.last_message.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatMessageTime(conversation.last_activity)}
                        </p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2 bg-white rounded-lg border flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-400" />
                  <h3 className="font-medium">{selectedConversation.customer_name}</h3>
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
                      const isFromMerchant = message.sender_type === 'merchant';
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isFromMerchant ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 ${
                              isFromMerchant
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              {isFromMerchant ? (
                                <Store className="w-3 h-3" />
                              ) : (
                                <User className="w-3 h-3" />
                              )}
                              <span className="text-xs opacity-75">
                                {isFromMerchant ? shop.name : 'Customer'}
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
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};