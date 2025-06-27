import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { enhancedDataService } from '@/services/enhancedDataService';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { CustomerChatInterface } from '@/components/CustomerChatInterface';
import { DirectMessage, Shop } from '@/types';
import { ArrowLeft, MessageSquare, Store, ShoppingBag, User, Clock } from 'lucide-react';

interface ChatThread {
  shop_id: string;
  shop_name: string;
  shop_category: string;
  last_message?: DirectMessage;
  unread_count: number;
  last_activity: number;
}

const CustomerChat = () => {
  const { user, isAuthenticated } = useAuth();
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadChatThreads();
    }
  }, [isAuthenticated, user]);

  const loadChatThreads = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get all shops that the customer has chatted with
      const response = await fetch(`/api/customers/${user.id}/chat-threads`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('localpick_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const threads = await response.json();
        setChatThreads(threads);
      }
    } catch (error) {
      console.error('Failed to load chat threads:', error);
      setChatThreads([]);
    } finally {
      setIsLoading(false);
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

  const getReservationCount = () => {
    const reservations = JSON.parse(localStorage.getItem('localpick_customer_reservations') || '[]');
    return reservations.length;
  };

  const totalUnreadMessages = chatThreads.reduce((sum, thread) => sum + thread.unread_count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  LocalPick
                </h1>
              </Link>
            </div>

            {/* Center - Page Title */}
            <div className="hidden md:block">
              <h2 className="text-lg font-semibold text-gray-800">
                My Chats
                {totalUnreadMessages > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {totalUnreadMessages} unread
                  </Badge>
                )}
              </h2>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-3">
              <Link to="/my-reservations">
                <Button variant="outline" size="default" className="gap-2 hover:bg-blue-50 transition-colors">
                  <ShoppingBag className="w-4 h-4" />
                  <span className="hidden sm:inline">My Reservations ({getReservationCount()})</span>
                  <span className="sm:hidden">({getReservationCount()})</span>
                </Button>
              </Link>
              <AuthHeader />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : chatThreads.length > 0 ? (
          <div className="grid lg:grid-cols-3 gap-6 h-[600px]">
            {/* Chat Threads List */}
            <div className="lg:col-span-1 bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Shop Conversations
                  <Badge variant="secondary" className="ml-auto">
                    {chatThreads.length}
                  </Badge>
                </h3>
              </div>
              
              <div className="overflow-y-auto h-[520px]">
                <div className="p-2 space-y-1">
                  {chatThreads.map((thread) => (
                    <button
                      key={thread.shop_id}
                      onClick={() => setSelectedThread(thread)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedThread?.shop_id === thread.shop_id
                          ? 'bg-blue-50 border-blue-200 border'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-sm">
                            {thread.shop_name}
                          </span>
                        </div>
                        {thread.unread_count > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {thread.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{thread.shop_category}</p>
                      {thread.last_message && (
                        <div>
                          <p className="text-xs text-gray-600 truncate">
                            {thread.last_message.sender_type === 'customer' ? 'You: ' : 'Shop: '}
                            {thread.last_message.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatMessageTime(thread.last_activity)}
                          </p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-2 bg-white rounded-lg border">
              {selectedThread ? (
                <CustomerChatInterface
                  shopId={selectedThread.shop_id}
                  shopName={selectedThread.shop_name}
                  onBack={() => setSelectedThread(null)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Select a shop to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No chats yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start conversations with shops by messaging them from product pages or your reservations.
            </p>
            <Link to="/">
              <Button size="lg" className="gap-2">
                <Store className="w-4 h-4" />
                Browse Shops
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerChat;