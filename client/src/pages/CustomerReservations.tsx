
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { enhancedDataService } from "@/services/enhancedDataService";
import { ArrowLeft, Clock, MapPin, ShoppingBag, Store } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";
import { AuthHeader } from "@/components/auth/AuthHeader";

interface CustomerReservation {
  id: string;
  productId: string;
  shopId: string;
  customerId: string;
  customerName: string;
  email?: string;
  status: 'pending' | 'approved' | 'ready' | 'completed';
  createdAt: string;
  productName: string;
  shopName: string;
  productPrice: number;
  productImage?: string;
}

const CustomerReservations = () => {
  const { user, isAuthenticated } = useAuth();
  const [reservations, setReservations] = useState<CustomerReservation[]>([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadReservations();
      // Set up polling for live updates
      const interval = setInterval(loadReservations, 10000); // Poll every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const loadReservations = async () => {
    if (!user) return;
    
    try {
      // Load from database instead of localStorage
      const dbReservations = await enhancedDataService.getReservationsByCustomer(user.id);
      
      // Also check localStorage for backward compatibility
      const localReservations = JSON.parse(localStorage.getItem('localpick_customer_reservations') || '[]');
      
      // Combine and deduplicate
      const allReservations = [...dbReservations, ...localReservations];
      const uniqueReservations = allReservations.filter((reservation, index, self) => 
        index === self.findIndex(r => r.id === reservation.id)
      );
      
      setReservations(uniqueReservations);
    } catch (error) {
      console.error('Failed to load reservations:', error);
      // Fallback to localStorage
      const savedReservations = JSON.parse(localStorage.getItem('localpick_customer_reservations') || '[]');
      setReservations(savedReservations);
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const reservationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - reservationTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Pending Approval', variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      case 'approved':
      case 'ready':
        return { text: 'Approved – Ready for Pickup', variant: 'default' as const, color: 'bg-green-100 text-green-800 border-green-200' };
      case 'completed':
        return { text: 'Completed', variant: 'outline' as const, color: 'bg-gray-100 text-gray-600 border-gray-200' };
      default:
        return { text: 'Pending Approval', variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    }
  };

  const getReservationCount = () => {
    const savedReservations = JSON.parse(localStorage.getItem('localpick_customer_reservations') || '[]');
    return savedReservations.length;
  };

  // Removed customer-side reservation management functions
  // All reservation status changes are now handled by merchants

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Consistent Header */}
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
                  LocalPick Market
                </h1>
              </Link>
            </div>

            {/* Center - Page Title */}
            <div className="hidden md:block">
              <h2 className="text-lg font-semibold text-gray-800">My Reservations</h2>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-3">
              {isAuthenticated && (
                <Link to="/my-reservations">
                  <Button variant="outline" size="default" className="gap-2 hover:bg-blue-50 transition-colors">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="hidden sm:inline">My Reservations ({getReservationCount()})</span>
                    <span className="sm:hidden">({getReservationCount()})</span>
                  </Button>
                </Link>
              )}
              <AuthHeader />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {reservations.length > 0 ? (
          <div className="space-y-4">
            {/* Header Stats */}
            <div className="mb-6">
              <p className="text-gray-600 text-sm">
                {reservations.length} reservation{reservations.length > 1 ? 's' : ''}
              </p>
            </div>

            {/* Reservation List - Amazon Style */}
            <div className="space-y-3">
              {reservations.map((reservation) => {
                const statusInfo = getStatusDisplay(reservation.status || 'pending');
                return (
                  <Link 
                    key={reservation.id} 
                    to={`/product/${reservation.productId}`}
                    className="block"
                  >
                    <Card className="hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-gray-300 cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Product Image */}
                          <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                            <img 
                              src={reservation.productImage || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=80&h=80&fit=crop&crop=center'} 
                              alt={reservation.productName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=80&h=80&fit=crop&crop=center';
                              }}
                            />
                          </div>
                          
                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900 text-lg leading-tight mb-1">
                                  {reservation.productName}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                  <Store className="w-4 h-4" />
                                  <span>{reservation.shopName}</span>
                                </div>
                                <div className="text-lg font-semibold text-gray-900 mb-2">
                                  ${reservation.productPrice || '0.00'}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  <span>Reserved {getTimeAgo(reservation.createdAt || reservation.timestamp)}</span>
                                </div>
                              </div>
                              
                              {/* Status Badge */}
                              <div className="flex-shrink-0 ml-4">
                                <Badge 
                                  variant={statusInfo.variant}
                                  className={`${statusInfo.color} font-medium`}
                                >
                                  {statusInfo.text}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {/* Continue Shopping */}
            <div className="pt-6 border-t">
              <Link to="/">
                <Button variant="outline" className="gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No reservations yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              When you reserve products, they'll appear here. Start browsing to make your first reservation.
            </p>
            <Link to="/">
              <Button size="lg" className="gap-2">
                <ShoppingBag className="w-4 h-4" />
                Browse Products
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerReservations;
