import React from 'react';
import { AppLayout } from './AppLayout';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Heart, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface CustomerLayoutProps {
  children: React.ReactNode;
  onSearch?: (query: string) => void;
  onLocationChange?: (location: string, coordinates?: { lat: number; lng: number }) => void;
  userLocation?: string;
  className?: string;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({
  children,
  onSearch,
  onLocationChange,
  userLocation,
  className
}) => {
  const { user, isAuthenticated } = useAuth();

  const headerActions = (
    <>
      {isAuthenticated && user?.role === 'user' && (
        <>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/my-reservations" className="flex items-center space-x-1">
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden lg:inline">My Orders</span>
            </Link>
          </Button>
          
          <Button variant="ghost" size="sm" asChild>
            <Link to="/favorites" className="flex items-center space-x-1">
              <Heart className="w-4 h-4" />
              <span className="hidden lg:inline">Favorites</span>
            </Link>
          </Button>
        </>
      )}
    </>
  );

  return (
    <AppLayout
      variant="customer"
      showSearch={true}
      searchPlaceholder="Search products, shops, or categories..."
      onSearch={onSearch}
      onLocationChange={onLocationChange}
      userLocation={userLocation}
      headerActions={headerActions}
      className={className}
    >
      {children}
    </AppLayout>
  );
};