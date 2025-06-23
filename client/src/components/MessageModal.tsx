import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Send, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';

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

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSendMessage: (message: string) => void;
}

const cannedResponses = [
  {
    id: 'out_of_stock',
    title: 'Item is out of stock...',
    content: 'Hi {customerName}, unfortunately the item in your order #{orderId} is currently out of stock. We expect to restock within 2-3 days. Would you like to wait or would you prefer a refund?'
  },
  {
    id: 'order_updated',
    title: 'Order status updated...',
    content: 'Hi {customerName}, your order #{orderId} status has been updated. You can track your order progress in your account. Thank you for your patience!'
  },
  {
    id: 'thanks_order',
    title: 'Thanks for your order...',
    content: 'Hi {customerName}, thank you for your recent order #{orderId}! We appreciate your business and hope you love your purchase. Please let us know if you have any questions.'
  },
  {
    id: 'delivery_delay',
    title: 'Delivery delay notification...',
    content: 'Hi {customerName}, we wanted to notify you that your order #{orderId} delivery may be delayed by 1-2 hours due to high demand. We apologize for any inconvenience and appreciate your understanding.'
  },
  {
    id: 'ready_pickup',
    title: 'Order ready for pickup...',
    content: 'Hi {customerName}, great news! Your order #{orderId} is ready for pickup. Please visit our store at your convenience during business hours. Thank you!'
  }
];

export const MessageModal: React.FC<MessageModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSendMessage
}) => {
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    const template = cannedResponses.find(t => t.id === templateId);
    if (template && customer) {
      let content = template.content
        .replace('{customerName}', customer.customerName)
        .replace('{orderId}', customer.lastOrderId.slice(-6));
      
      setMessage(content);
      setSelectedTemplate(templateId);
    }
  };

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      setSelectedTemplate('');
      onClose();
    }
  };

  const handleClose = () => {
    setMessage('');
    setSelectedTemplate('');
    onClose();
  };

  if (!customer) return null;

  const getIssueIcon = () => {
    if (customer.issueFlag) {
      return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getStatusIcon = () => {
    switch (customer.status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'recent':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'inactive':
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`${isMobile ? 'w-full h-full max-w-none m-0 rounded-none' : 'max-w-2xl'}`}>
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Send Message to Customer</DialogTitle>
            {isMobile && (
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <DialogDescription asChild>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    {getIssueIcon()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">{customer.customerName}</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>📞 {customer.customerPhone}</p>
                      <p>📦 Last Order: #{customer.lastOrderId.slice(-6)}</p>
                      <div className="flex items-center gap-2">
                        {getStatusIcon()}
                        <span className="capitalize">{customer.status} Customer</span>
                        {customer.issueFlag && (
                          <span className="text-orange-600 font-medium">• Issue Flagged</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {customer.issueFlag && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="font-medium text-orange-800 mb-1">Issue Summary</h4>
                    <p className="text-sm text-orange-700">
                      Customer has reported an issue with their recent order. May require immediate attention.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Canned Response Dropdown */}
          <div>
            <Label htmlFor="canned-response">Quick Response Templates</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template to get started..." />
              </SelectTrigger>
              <SelectContent>
                {cannedResponses.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message Input */}
          <div>
            <Label htmlFor="message">Your Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message to the customer..."
              rows={isMobile ? 6 : 5}
              className="resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                Be friendly and professional in your communication.
              </p>
              <span className="text-xs text-gray-400">
                {message.length}/500
              </span>
            </div>
          </div>

          {/* Template Preview */}
          {selectedTemplate && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-600 font-medium mb-1">Template Preview:</p>
              <p className="text-sm text-blue-800">
                {cannedResponses.find(t => t.id === selectedTemplate)?.content
                  .replace('{customerName}', customer.customerName)
                  .replace('{orderId}', customer.lastOrderId.slice(-6))}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
          <Button 
            onClick={handleSend}
            disabled={!message.trim()}
            className={`${isMobile ? 'w-full' : ''} flex items-center gap-2`}
          >
            <Send className="w-4 h-4" />
            Send Message
          </Button>
          {!isMobile && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MessageModal;