import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useChatThreads } from '@/hooks/useChatThreads';
import { ArrowLeft, MessageSquare, ShoppingBag, Store, Loader2 } from 'lucide-react';
import { useOrderCount } from '@/hooks/useOrderCount';

const ChatOverview = () => {
  const { 
    threads, 
    loading, 
    error, 
    getTotalUnreadCount,
    markThreadAsRead,
    sendMessage
  } = useChatThreads();
  
  const [activeTab, setActiveTab] = useState<string>('');

  // Set the first thread as active when threads are loaded
  React.useEffect(() => {
    if (threads.length > 0 && !activeTab) {
      setActiveTab(threads[0].shop_id);
    }
  }, [threads, activeTab]);

  // Order count hook for unified order count management
  const { activeOrderCount } = useOrderCount();
  
  const getReservationCount = () => {
    return activeOrderCount;
  };

  const handleSendMessage = async (shopId: string, message: string) => {
    await sendMessage(shopId, message);
  };

  const handleMarkAsRead = (shopId: string) => {
    markThreadAsRead(shopId);
  };

  const totalUnread = getTotalUnreadCount();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading chats...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm flex-shrink-0">
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
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                My Chats
                {totalUnread > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {totalUnread} unread
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

      <div className="container mx-auto px-4 py-4 max-w-7xl flex-1 flex flex-col">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {threads.length === 0 ? (
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
        ) : (
          <Card className="h-full flex flex-col">
            <CardContent className="p-0 h-full overflow-hidden">
              <Tabs 
                value={activeTab} 
                onValueChange={setActiveTab}
                className="h-full flex flex-col"
              >
                {/* Tabs List */}
                <div className="border-b bg-gray-50 p-4">
                  <TabsList className="grid grid-cols-1 gap-1 h-auto bg-transparent p-0">
                    <div className="flex flex-wrap gap-2">
                      {threads.map((thread) => (
                        <TabsTrigger
                          key={thread.shop_id}
                          value={thread.shop_id}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border 
                                   data-[state=active]:bg-blue-50 data-[state=active]:border-blue-200 
                                   data-[state=active]:text-blue-700 hover:bg-gray-100"
                        >
                          <Store className="w-4 h-4" />
                          <span className="max-w-[120px] truncate">{thread.shop_name}</span>
                          {thread.unread_count > 0 && (
                            <Badge variant="destructive" className="text-xs min-w-[20px] h-5">
                              {thread.unread_count}
                            </Badge>
                          )}
                        </TabsTrigger>
                      ))}
                    </div>
                  </TabsList>
                </div>

                {/* Tabs Content */}
                <div className="flex-1">
                  {threads.map((thread) => (
                    <TabsContent 
                      key={thread.shop_id}
                      value={thread.shop_id}
                      className="h-full m-0"
                    >
                      <ChatWindow
                        thread={thread}
                        onSendMessage={(message) => handleSendMessage(thread.shop_id, message)}
                        onMarkAsRead={() => handleMarkAsRead(thread.shop_id)}
                        className="h-full"
                      />
                    </TabsContent>
                  ))}
                </div>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ChatOverview;