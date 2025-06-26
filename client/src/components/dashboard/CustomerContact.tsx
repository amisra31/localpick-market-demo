import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { enhancedDataService } from '@/services/enhancedDataService';
import { Order, Shop } from '@/types';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Search, Users, Phone, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { CustomerCard } from '@/components/CustomerCard';
import { MessageModal } from '@/components/MessageModal';
import { MerchantChatInterface } from '@/components/MerchantChatInterface';

interface CustomerContactProps {
  shop: Shop | null;
  orders: Order[];
}

interface Customer {
  customerId: string;
  customerName: string;
  customerPhone: string;
  lastOrderId: string;
  status: 'active' | 'recent' | 'inactive';
  issueFlag: boolean;
  totalOrders: number;
  lastOrderDate: string;
}

export const CustomerContact: React.FC<CustomerContactProps> = ({ shop, orders }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  // Transform orders into customer data
  const customers: Customer[] = orders.reduce((acc, order) => {
    const existingCustomer = acc.find(c => c.customerId === order.customerId);
    if (existingCustomer) {
      existingCustomer.totalOrders += 1;
      if (new Date(order.createdAt) > new Date(existingCustomer.lastOrderDate)) {
        existingCustomer.lastOrderDate = order.createdAt;
        existingCustomer.lastOrderId = order.id;
      }
    } else {
      const daysSinceOrder = Math.floor(
        (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      let status: 'active' | 'recent' | 'inactive' = 'inactive';
      if (daysSinceOrder <= 7) status = 'active';
      else if (daysSinceOrder <= 30) status = 'recent';
      
      // Simulate issue flags for some customers (in real app, this would come from order data)
      const issueFlag = Math.random() < 0.3; // 30% chance of having an issue
      
      acc.push({
        customerId: order.customerId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        lastOrderId: order.id,
        lastOrderDate: order.createdAt,
        status,
        issueFlag,
        totalOrders: 1
      });
    }
    return acc;
  }, [] as Customer[]);

  // Sort customers by last order date (most recent first)
  const sortedCustomers = customers.sort((a, b) => 
    new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()
  );

  // Filter customers based on search term
  const filteredCustomers = sortedCustomers.filter(customer =>
    customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customerPhone.includes(searchTerm) ||
    customer.lastOrderId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMessageClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsMessageModalOpen(true);
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedCustomer || !shop) return;

    // Find the most recent order for this customer
    const customerOrders = orders.filter(o => o.customerId === selectedCustomer.customerId);
    const recentOrder = customerOrders.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    if (!recentOrder) return;

    // Get current merchant ID instead of using shop.ownerId
    const merchantId = enhancedDataService.getCurrentMerchantId();
    if (!merchantId) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive"
      });
      return;
    }

    try {
      await enhancedDataService.sendOrderMessage(
        recentOrder.id,
        merchantId,
        'merchant',
        message
      );
      
      toast({
        title: "Message Sent Successfully",
        description: `Your message has been sent to ${selectedCustomer.customerName}.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const getCustomerStats = () => {
    const active = customers.filter(c => c.status === 'active').length;
    const recent = customers.filter(c => c.status === 'recent').length;
    const withIssues = customers.filter(c => c.issueFlag).length;
    
    return { 
      total: customers.length, 
      active, 
      recent, 
      withIssues,
      inactive: customers.length - active - recent
    };
  };

  const stats = getCustomerStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contact Customers</h2>
          <p className="text-gray-600">Communicate with your customers and build relationships</p>
        </div>
      </div>

      {/* Customer Statistics */}
      {customers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Customers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-600">Active (7 days)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.recent}</div>
              <div className="text-sm text-gray-600">Recent (30 days)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.withIssues}</div>
              <div className="text-sm text-gray-600">Issues Flagged</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabbed Interface for Different Communication Types */}
      <Tabs defaultValue="order-messages" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="order-messages">Order Messages</TabsTrigger>
          <TabsTrigger value="direct-chat">Direct Chat</TabsTrigger>
        </TabsList>
        
        <TabsContent value="order-messages" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Users className="w-6 h-6" />
                  Customer List
                  {filteredCustomers.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {filteredCustomers.length} customers
                    </Badge>
                  )}
                </CardTitle>
                {customers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by name, phone, or order ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full md:w-80"
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!shop ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Set up your shop first</h3>
                  <p className="text-gray-500">
                    Create your shop profile to start connecting with customers.
                  </p>
                </div>
              ) : filteredCustomers.length > 0 ? (
                <div className="space-y-4">
                  {/* Priority Issues Section */}
                  {filteredCustomers.some(c => c.issueFlag) && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <h3 className="font-semibold text-gray-900">Customers with Issues</h3>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          {filteredCustomers.filter(c => c.issueFlag).length}
                        </Badge>
                      </div>
                      <div className="grid gap-4">
                        {filteredCustomers
                          .filter(customer => customer.issueFlag)
                          .map((customer) => (
                            <CustomerCard
                              key={customer.customerId}
                              customer={customer}
                              onMessageClick={handleMessageClick}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* All Customers Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-5 h-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">All Customers</h3>
                    </div>
                    <div className="grid gap-4">
                      {filteredCustomers
                        .filter(customer => !customer.issueFlag)
                        .map((customer) => (
                          <CustomerCard
                            key={customer.customerId}
                            customer={customer}
                            onMessageClick={handleMessageClick}
                          />
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    {customers.length === 0 ? 'No customers yet' : 'No customers found'}
                  </h3>
                  <p className="text-gray-500">
                    {customers.length === 0 
                      ? 'Customers will appear here after they place orders.' 
                      : `No customers match your search for "${searchTerm}".`}
                  </p>
                  {searchTerm && (
                    <div className="mt-4">
                      <button
                        onClick={() => setSearchTerm('')}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Clear search
                      </button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="direct-chat" className="space-y-4">
          {shop ? (
            <MerchantChatInterface 
              shop={shop}
            />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Set up your shop first</h3>
                <p className="text-gray-500">
                  Create your shop profile to start receiving direct messages from customers.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Message Modal */}
      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={() => {
          setIsMessageModalOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};