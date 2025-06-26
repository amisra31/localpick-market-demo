import React from 'react';
import { AppLayout } from './AppLayout';
import { Button } from '@/components/ui/button';
import { Store, Package, BarChart3, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MerchantLayoutProps {
  children: React.ReactNode;
  onSearch?: (query: string) => void;
  className?: string;
}

export const MerchantLayout: React.FC<MerchantLayoutProps> = ({
  children,
  onSearch,
  className
}) => {
  const headerActions = (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link to="/shop-owner-dashboard" className="flex items-center space-x-1">
          <BarChart3 className="w-4 h-4" />
          <span className="hidden lg:inline">Dashboard</span>
        </Link>
      </Button>
      
      <Button variant="ghost" size="sm" asChild>
        <Link to="/manage-shop" className="flex items-center space-x-1">
          <Store className="w-4 h-4" />
          <span className="hidden lg:inline">My Shop</span>
        </Link>
      </Button>
      
      <Button variant="ghost" size="sm" asChild>
        <Link to="/products" className="flex items-center space-x-1">
          <Package className="w-4 h-4" />
          <span className="hidden lg:inline">Products</span>
        </Link>
      </Button>
      
      <Button variant="ghost" size="sm" asChild>
        <Link to="/messages" className="flex items-center space-x-1">
          <MessageSquare className="w-4 h-4" />
          <span className="hidden lg:inline">Messages</span>
        </Link>
      </Button>
    </>
  );

  return (
    <AppLayout
      variant="merchant"
      showSearch={true}
      searchPlaceholder="Search your products, orders..."
      onSearch={onSearch}
      headerActions={headerActions}
      className={className}
    >
      {children}
    </AppLayout>
  );
};