import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, MessageSquare, AlertTriangle, User } from 'lucide-react';

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

interface CustomerCardProps {
  customer: Customer;
  onMessageClick: (customer: Customer) => void;
}

const getStatusInfo = (status: Customer['status']) => {
  switch (status) {
    case 'active':
      return { label: 'Active', color: 'bg-green-100 text-green-800' };
    case 'recent':
      return { label: 'Recent', color: 'bg-blue-100 text-blue-800' };
    case 'inactive':
      return { label: 'Inactive', color: 'bg-gray-100 text-gray-800' };
    default:
      return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
  }
};

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onMessageClick }) => {
  const statusInfo = getStatusInfo(customer.status);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900 truncate">{customer.customerName}</h4>
                {customer.issueFlag && (
                  <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                )}
              </div>
              
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <span>{customer.customerPhone}</span>
                </div>
                <div>
                  <span className="text-gray-500">Last Order:</span>
                  <span className="ml-1">#{customer.lastOrderId.slice(-6)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Total Orders:</span>
                  <span className="ml-1 font-medium">{customer.totalOrders}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <Badge variant="outline" className={statusInfo.color}>
                  {statusInfo.label}
                </Badge>
                <span className="text-xs text-gray-400">
                  {new Date(customer.lastOrderDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 ml-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMessageClick(customer)}
              className="flex items-center gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              Message
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(`tel:${customer.customerPhone}`, '_self')}
              className="flex items-center gap-1"
            >
              <Phone className="w-3 h-3" />
              Call
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerCard;