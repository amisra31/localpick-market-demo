import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage, ChatThread } from '@/hooks/useChatThreads';
import { Send, User, Store, Loader2 } from 'lucide-react';

interface ChatWindowProps {
  thread: ChatThread;
  onSendMessage: (message: string) => Promise<void>;
  onMarkAsRead: () => void;
  className?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  thread,
  onSendMessage,
  onMarkAsRead,
  className = ''
}) => {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use thread messages directly instead of local state
  const messages = thread.messages || [];

  // WebSocket connection is handled by useChatThreads hook
  const isConnected = true; // Assume connected for UI purposes

  useEffect(() => {
    scrollToBottom();
  }, [thread, messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Mark as read when component mounts or thread changes
    if (thread.unread_count > 0) {
      onMarkAsRead();
    }
  }, [thread.shop_id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      await onSendMessage(messageContent);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent); // Restore the message text
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-gray-400" />
            <div>
              <h3 className="font-semibold text-gray-900">{thread.shop_name}</h3>
              <p className="text-sm text-gray-500">{thread.shop_category}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {thread.unread_count > 0 && (
              <Badge variant="destructive" className="text-xs">
                {thread.unread_count} unread
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 bg-white">
        <div className="space-y-3">
          {messages.map((message, index) => {
            const isFromCustomer = message.sender_type === 'customer';
            const isRecentMessage = index >= messages.length - 3; // Last 3 messages
            const now = Date.now();
            const isVeryRecent = (now - message.created_at) < (5 * 60 * 1000); // Last 5 minutes
            
            return (
              <div
                key={message.id}
                className={`flex ${isFromCustomer ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                    isFromCustomer
                      ? isVeryRecent
                        ? 'bg-blue-700 text-white' // Very recent customer messages - darker blue
                        : isRecentMessage
                        ? 'bg-blue-600 text-white' // Recent customer messages - blue
                        : 'bg-blue-500 text-white' // Older customer messages - lighter blue
                      : isVeryRecent
                      ? 'bg-gray-700 text-white' // Very recent merchant messages - dark gray
                      : isRecentMessage
                      ? 'bg-gray-600 text-white' // Recent merchant messages - medium gray
                      : 'bg-gray-500 text-white' // Older merchant messages - lighter gray
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    {isFromCustomer ? (
                      <User className="w-3 h-3 opacity-75" />
                    ) : (
                      <Store className="w-3 h-3 opacity-75" />
                    )}
                    <span className="text-xs opacity-75 font-medium">
                      {isFromCustomer ? 'You' : thread.shop_name}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
                  <div className="text-xs opacity-75 mt-2 text-right">
                    {formatMessageTime(message.created_at)}
                    {isVeryRecent && (
                      <span className="ml-1 inline-block w-1.5 h-1.5 bg-current rounded-full opacity-60"></span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-gray-100">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${thread.shop_name}...`}
            disabled={isSending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
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
    </div>
  );
};