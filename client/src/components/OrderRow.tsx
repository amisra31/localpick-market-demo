import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Order, OrderStatus } from '@/types';
import { Phone, MapPin, Package, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface OrderRowProps {
  order: Order;
  productName: string;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  isMobile?: boolean;
}

const getOrderStatusInfo = (status: OrderStatus) => {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending',
        icon: <Clock className="w-4 h-4" />,
        color: 'bg-yellow-100 text-yellow-800',
        description: 'New order awaiting processing'
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        icon: <Package className="w-4 h-4" />,
        color: 'bg-blue-100 text-blue-800',
        description: 'Order is being prepared'
      };
    case 'delivered':
      return {
        label: 'Delivered',
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'bg-green-100 text-green-800',
        description: 'Order has been delivered'
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        icon: <AlertCircle className="w-4 h-4" />,
        color: 'bg-red-100 text-red-800',
        description: 'Order was cancelled'
      };
    default:
      return {
        label: 'Unknown',
        icon: <AlertCircle className="w-4 h-4" />,
        color: 'bg-gray-100 text-gray-800',
        description: ''
      };
  }
};

export const OrderRow: React.FC<OrderRowProps> = ({ 
  order, 
  productName, 
  onStatusChange,
  isMobile = false 
}) => {
  const statusInfo = getOrderStatusInfo(order.status);

  if (isMobile) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-lg">#{order.id.slice(-6)}</h4>
                <p className="text-sm text-gray-600">{productName}</p>
              </div>
              <Badge variant="outline" className={statusInfo.color}>
                <span className="flex items-center gap-1">
                  {statusInfo.icon}
                  {statusInfo.label}
                </span>
              </Badge>
            </div>

            {/* Order Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Quantity:</span>
                <span className="ml-1 font-medium">{order.quantity}</span>
              </div>
              <div>
                <span className="text-gray-500">Total:</span>
                <span className="ml-1 font-medium">${order.totalAmount}</span>
              </div>
            </div>

            {/* Customer Info */}
            <div className="space-y-2">
              <div>
                <h5 className="font-medium text-gray-900">{order.customerName}</h5>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {order.customerPhone}
                </p>
              </div>
              <p className="text-sm text-gray-600 flex items-start gap-1">
                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span className="break-words">{order.deliveryAddress}</span>
              </p>
            </div>

            {/* Date and Status Update */}
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-xs text-gray-400">
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
              <Select 
                value={order.status} 
                onValueChange={(value: OrderStatus) => onStatusChange(order.id, value)}
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
          </div>
        </CardContent>
      </Card>
    );
  }

  // Desktop table row
  return null; // This will be handled by the table in the parent component
};

export default OrderRow;