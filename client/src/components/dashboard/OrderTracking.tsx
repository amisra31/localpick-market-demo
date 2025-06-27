import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { enhancedDataService } from '@/services/enhancedDataService';
import { Order, OrderStatus, Product, Shop } from '@/types';
import { toast } from '@/hooks/use-toast';
import { ShoppingCart, Search, Filter, Phone, MapPin, Package, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { OrderRow } from '@/components/OrderRow';

interface OrderTrackingProps {
  shop: Shop | null;
  orders: Order[];
  products: Product[];
  onOrdersUpdate: () => void;
}

const getOrderStatusInfo = (status: OrderStatus) => {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending',
        icon: <Clock className="w-4 h-4" />,
        color: 'bg-yellow-100 text-yellow-800'
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        icon: <Package className="w-4 h-4" />,
        color: 'bg-blue-100 text-blue-800'
      };
    case 'delivered':
      return {
        label: 'Delivered',
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'bg-green-100 text-green-800'
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        icon: <AlertCircle className="w-4 h-4" />,
        color: 'bg-red-100 text-red-800'
      };
    default:
      return {
        label: 'Unknown',
        icon: <AlertCircle className="w-4 h-4" />,
        color: 'bg-gray-100 text-gray-800'
      };
  }
};

export const OrderTracking: React.FC<OrderTrackingProps> = ({ 
  shop, 
  orders, 
  products, 
  onOrdersUpdate 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [isMobile, setIsMobile] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    orderId: string;
    newStatus: OrderStatus;
    orderDetails?: Order;
  }>({
    open: false,
    orderId: '',
    newStatus: 'pending'
  });

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const handleOrderStatusChange = (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    setConfirmDialog({
      open: true,
      orderId,
      newStatus,
      orderDetails: order
    });
  };

  const confirmStatusChange = async () => {
    try {
      console.log(`🔄🏪 Merchant initiating order status update:`, {
        orderId: confirmDialog.orderId,
        oldStatus: confirmDialog.orderDetails?.status,
        newStatus: confirmDialog.newStatus,
        shopId: shop?.id,
        timestamp: new Date().toISOString()
      });
      
      const result = await enhancedDataService.updateOrderStatus(confirmDialog.orderId, confirmDialog.newStatus);
      
      console.log(`✅🏪 Merchant order status update completed:`, {
        orderId: confirmDialog.orderId,
        newStatus: confirmDialog.newStatus,
        apiResult: result,
        timestamp: new Date().toISOString()
      });
      
      // Don't call onOrdersUpdate() anymore since we have real-time WebSocket updates
      // onOrdersUpdate();
      
      toast({
        title: "Order Updated",
        description: `Order status changed to ${confirmDialog.newStatus}.`
      });
      setConfirmDialog({ open: false, orderId: '', newStatus: 'pending' });
    } catch (error) {
      console.error('❌🏪 Merchant order status update failed:', {
        orderId: confirmDialog.orderId,
        newStatus: confirmDialog.newStatus,
        error: error,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const cancelStatusChange = () => {
    setConfirmDialog({ open: false, orderId: '', newStatus: 'pending' });
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Unknown Product';
  };

  // Filter orders based on search term and status
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getOrderStats = () => {
    const pending = orders.filter(o => o.status === 'pending').length;
    const inProgress = orders.filter(o => o.status === 'in_progress').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    
    return { pending, inProgress, delivered, cancelled, total: orders.length };
  };

  const stats = getOrderStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Track Orders</h2>
          <p className="text-gray-600">Monitor and manage customer orders</p>
        </div>
      </div>

      {/* Order Statistics */}
      {orders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Orders</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
              <div className="text-sm text-gray-600">Delivered</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
              <div className="text-sm text-gray-600">Cancelled</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Orders
              {filteredOrders.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filteredOrders.length} orders
                </Badge>
              )}
            </CardTitle>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: OrderStatus | 'all') => setStatusFilter(value)}>
                <SelectTrigger className="w-full md:w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!shop ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Set up your shop first</h3>
              <p className="text-gray-500">
                Create your shop profile to start receiving and managing orders.
              </p>
            </div>
          ) : filteredOrders.length > 0 ? (
            <>
              {/* Desktop Table View */}
              {!isMobile ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Order Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => {
                        const statusInfo = getOrderStatusInfo(order.status);
                        return (
                          <TableRow key={order.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">
                              #{order.id.slice(-6)}
                            </TableCell>
                            <TableCell>{getProductName(order.productId)}</TableCell>
                            <TableCell>{order.quantity}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-2">
                                <Badge variant="outline" className={statusInfo.color}>
                                  <span className="flex items-center gap-1">
                                    {statusInfo.icon}
                                    {statusInfo.label}
                                  </span>
                                </Badge>
                                <Select 
                                  value={order.status} 
                                  onValueChange={(value: OrderStatus) => handleOrderStatusChange(order.id, value)}
                                >
                                  <SelectTrigger className="w-32 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {order.customerName}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="w-3 h-3" />
                                {order.customerPhone}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-start gap-1 text-sm max-w-xs">
                                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span className="break-words">{order.deliveryAddress}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                /* Mobile Card View */
                <div className="space-y-4">
                  {filteredOrders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      productName={getProductName(order.productId)}
                      onStatusChange={handleOrderStatusChange}
                      isMobile={true}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {orders.length === 0 ? 'No orders yet' : 'No results found'}
              </h3>
              <p className="text-gray-500">
                {orders.length === 0 
                  ? 'Orders will appear here when customers place them.' 
                  : `No orders match your search for "${searchTerm}" or selected filters.`}
              </p>
              {(searchTerm || statusFilter !== 'all') && (
                <div className="mt-4 space-x-2">
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Clear search
                  </button>
                  <span className="text-gray-400">•</span>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={cancelStatusChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Order Status Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change the status of this order?
            </DialogDescription>
          </DialogHeader>
          
          {confirmDialog.orderDetails && (
            <div className="space-y-3 py-4">
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Order ID:</span>
                  <span>#{confirmDialog.orderId.slice(-6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Customer:</span>
                  <span>{confirmDialog.orderDetails.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Product:</span>
                  <span>{getProductName(confirmDialog.orderDetails.productId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Current Status:</span>
                  <Badge variant="outline" className={getOrderStatusInfo(confirmDialog.orderDetails.status).color}>
                    {getOrderStatusInfo(confirmDialog.orderDetails.status).label}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">New Status:</span>
                  <Badge variant="outline" className={getOrderStatusInfo(confirmDialog.newStatus).color}>
                    {getOrderStatusInfo(confirmDialog.newStatus).label}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={cancelStatusChange}>
              Cancel
            </Button>
            <Button onClick={confirmStatusChange}>
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};