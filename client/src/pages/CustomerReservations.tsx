
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { enhancedDataService } from "@/services/enhancedDataService";
import { useChatWebSocket } from "@/hooks/useChatWebSocket";
import { useCustomerOrderSync } from "@/hooks/useOrderWebSocket";
import { ArrowLeft, Clock, MapPin, ShoppingBag, Store, MessageSquare, X, Heart, Trash2 } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";
import { AuthHeader } from "@/components/auth/AuthHeader";

interface CustomerReservation {
  id: string;
  productId: string;
  shopId: string;
  customerId: string;
  customerName: string;
  email?: string;
  status: 'pending' | 'approved' | 'ready' | 'completed' | 'reserved' | 'in_progress' | 'delivered' | 'cancelled';
  createdAt: string;
  productName: string;
  shopName: string;
  productPrice: number;
  productImage?: string;
}

interface WishlistItem {
  id: string;
  productId: string;
  shopId: string;
  productName: string;
  shopName: string;
  shopCategory: string;
  productPrice: number;
  productImage?: string;
  createdAt: string;
}

const CustomerReservations = () => {
  const { user, isAuthenticated } = useAuth();
  const [reservations, setReservations] = useState<CustomerReservation[]>([]);
  const [cancellingReservation, setCancellingReservation] = useState<string | null>(null);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [removingFromWishlist, setRemovingFromWishlist] = useState<string | null>(null);

  // Real-time order status updates via WebSocket
  const { isConnected } = useCustomerOrderSync((updatedOrder) => {
    console.log('👤🔄 Customer received order update via WebSocket:', {
      orderId: updatedOrder.id,
      newStatus: updatedOrder.status,
      customerId: user?.id,
      currentReservations: reservations.map(r => ({ id: r.id, status: r.status })),
      timestamp: new Date().toISOString()
    });
    
    // Update reservations with new status
    setReservations(prev => {
      const orderToUpdate = prev.find(res => res.id === updatedOrder.id);
      if (!orderToUpdate) {
        console.log('⚠️ Customer: Order not found in current reservations for update:', updatedOrder.id);
        return prev;
      }
      
      const updated = prev.map(res => 
        res.id === updatedOrder.id 
          ? { ...res, status: updatedOrder.status }
          : res
      );
      
      console.log('👤✅ Customer reservations updated:', {
        orderId: updatedOrder.id,
        oldStatus: orderToUpdate.status,
        newStatus: updatedOrder.status,
        updatedReservations: updated.map(r => ({ id: r.id, status: r.status }))
      });
      
      return updated;
    });
    
    // Also update localStorage for backward compatibility
    const localReservations = JSON.parse(localStorage.getItem('localpick_customer_reservations') || '[]');
    const updatedLocal = localReservations.map((res: any) => 
      res.id === updatedOrder.id ? { ...res, status: updatedOrder.status } : res
    );
    localStorage.setItem('localpick_customer_reservations', JSON.stringify(updatedLocal));
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      loadReservations();
      loadWishlist();
      // Set up polling for live updates
      const interval = setInterval(() => {
        loadReservations();
        loadWishlist();
      }, 10000); // Poll every 10 seconds
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
      case 'reserved':
        return { text: 'Reserved', variant: 'default' as const, color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'completed':
        return { text: 'Completed', variant: 'outline' as const, color: 'bg-gray-100 text-gray-600 border-gray-200' };
      case 'cancelled':
        return { text: 'Cancelled', variant: 'outline' as const, color: 'bg-red-100 text-red-600 border-red-200' };
      case 'in_progress':
        return { text: 'In Progress', variant: 'default' as const, color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'delivered':
        return { text: 'Delivered', variant: 'default' as const, color: 'bg-green-100 text-green-800 border-green-200' };
      default:
        return { text: 'Pending Approval', variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    }
  };

  const getReservationCount = () => {
    const savedReservations = JSON.parse(localStorage.getItem('localpick_customer_reservations') || '[]');
    return savedReservations.length;
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!user) return;
    
    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to cancel this reservation?');
    if (!confirmed) return;
    
    setCancellingReservation(reservationId);
    try {
      const response = await fetch(`/api/orders/${reservationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('localpick_token')}`
        }
      });
      
      if (response.ok) {
        // Remove from local state
        setReservations(prev => prev.filter(res => res.id !== reservationId));
        
        // Also remove from localStorage
        const localReservations = JSON.parse(localStorage.getItem('localpick_customer_reservations') || '[]');
        const updatedLocal = localReservations.filter((res: any) => res.id !== reservationId);
        localStorage.setItem('localpick_customer_reservations', JSON.stringify(updatedLocal));
        
        // Show success message
        console.log('Reservation cancelled and merchant notified');
      }
    } catch (error) {
      console.error('Failed to cancel reservation:', error);
    } finally {
      setCancellingReservation(null);
    }
  };

  const loadWishlist = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/customers/${user.id}/wishlist`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('localpick_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const items = await response.json();
        setWishlistItems(items);
      }
    } catch (error) {
      console.error('Failed to load wishlist:', error);
      setWishlistItems([]);
    }
  };

  const handleRemoveFromWishlist = async (wishlistItemId: string) => {
    if (!user) return;
    
    setRemovingFromWishlist(wishlistItemId);
    try {
      const response = await fetch(`/api/wishlist/${wishlistItemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('localpick_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setWishlistItems(prev => prev.filter(item => item.id !== wishlistItemId));
      }
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    } finally {
      setRemovingFromWishlist(null);
    }
  };

  const groupWishlistByCategory = (items: WishlistItem[]) => {
    return items.reduce((acc, item) => {
      const category = item.shopCategory || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, WishlistItem[]>);
  };

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
                <>
                  <Link to="/chat">
                    <Button variant="outline" size="default" className="gap-2 hover:bg-blue-50 transition-colors">
                      <MessageSquare className="w-4 h-4" />
                      <span className="hidden sm:inline">Chat</span>
                    </Button>
                  </Link>
                  <Link to="/my-reservations">
                    <Button variant="outline" size="default" className="gap-2 hover:bg-blue-50 transition-colors">
                      <ShoppingBag className="w-4 h-4" />
                      <span className="hidden sm:inline">My Reservations ({getReservationCount()})</span>
                      <span className="sm:hidden">({getReservationCount()})</span>
                    </Button>
                  </Link>
                </>
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
                const canCancel = !['completed', 'cancelled', 'delivered'].includes(reservation.status || 'pending');
                
                return (
                  <Card key={reservation.id} className="hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-gray-300">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <Link to={`/product/${reservation.productId}`} className="flex-shrink-0">
                          <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden hover:opacity-75 transition-opacity">
                            <img 
                              src={reservation.productImage || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=80&h=80&fit=crop&crop=center'} 
                              alt={reservation.productName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=80&h=80&fit=crop&crop=center';
                              }}
                            />
                          </div>
                        </Link>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <Link to={`/product/${reservation.productId}`} className="hover:text-blue-600">
                                <h3 className="font-medium text-gray-900 text-lg leading-tight mb-1 hover:underline">
                                  {reservation.productName}
                                </h3>
                              </Link>
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
                            
                            {/* Status Badge and Actions */}
                            <div className="flex-shrink-0 ml-4 flex flex-col items-end gap-2">
                              <Badge 
                                variant={statusInfo.variant}
                                className={`${statusInfo.color} font-medium`}
                              >
                                {statusInfo.text}
                              </Badge>
                              
                              {/* Cancel Button */}
                              {canCancel && (
                                <button
                                  onClick={() => handleCancelReservation(reservation.id)}
                                  disabled={cancellingReservation === reservation.id}
                                  className="text-xs text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
                                >
                                  {cancellingReservation === reservation.id ? 'Cancelling...' : 'Cancel'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Wishlist Section */}
            <div className="pt-8 border-t">
              <div className="flex items-center gap-2 mb-6">
                <Heart className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900">My Wishlist</h3>
                <Badge variant="secondary">{wishlistItems.length} items</Badge>
              </div>
              
              {wishlistItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No items in your wishlist yet</p>
                  <p className="text-sm">Add products to your wishlist while browsing</p>
                </div>
              ) : (
                Object.entries(groupWishlistByCategory(wishlistItems)).map(([category, items]) => (
                  <div key={category} className="mb-6">
                    <h4 className="font-medium text-gray-800 mb-3">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map((item) => (
                        <Card key={item.id} className="hover:shadow-md transition-all duration-200">
                          <CardContent className="p-4">
                            <div className="flex gap-3">
                              <Link to={`/product/${item.productId}`} className="flex-shrink-0">
                                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden hover:opacity-75 transition-opacity">
                                  <img 
                                    src={item.productImage || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=64&h=64&fit=crop&crop=center'} 
                                    alt={item.productName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = 'https://images.unsplash.com/photo-1560472354-b43ff0c44a43?w=64&h=64&fit=crop&crop=center';
                                    }}
                                  />
                                </div>
                              </Link>
                              <div className="flex-1 min-w-0">
                                <Link to={`/product/${item.productId}`} className="hover:text-blue-600">
                                  <h5 className="font-medium text-sm text-gray-900 leading-tight mb-1 hover:underline">
                                    {item.productName}
                                  </h5>
                                </Link>
                                <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                                  <Store className="w-3 h-3" />
                                  <span className="truncate">{item.shopName}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-green-600">${item.productPrice}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveFromWishlist(item.id)}
                                    disabled={removingFromWishlist === item.id}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                                  >
                                    {removingFromWishlist === item.id ? (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500"></div>
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* OLD CODE - Keeping for reference
            {wishlistItems.length > 0 && (
              <div className="pt-8 border-t">
                <div className="flex items-center gap-2 mb-6">
                  <Heart className="w-5 h-5 text-red-500" />
                  <h3 className="text-lg font-semibold text-gray-900">My Wishlist</h3>
                  <Badge variant="secondary">{wishlistItems.length} items</Badge>
                </div>
                
                {Object.entries(groupWishlistByCategory(wishlistItems)).map(([category, items]) => (
                  <div key={category} className="mb-6">
                    <h4 className="font-medium text-gray-800 mb-3">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map((item) => (
                        <Card key={item.id} className="hover:shadow-md transition-all duration-200">
                          <CardContent className="p-4">
                            <div className="flex gap-3">
                              <Link to={`/product/${item.productId}`} className="flex-shrink-0">
                                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden hover:opacity-75 transition-opacity">
                                  <img 
                                    src={item.productImage || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=64&h=64&fit=crop&crop=center'} 
                                    alt={item.productName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=64&h=64&fit=crop&crop=center';
                                    }}
                                  />
                                </div>
                              </Link>
                              <div className="flex-1 min-w-0">
                                <Link to={`/product/${item.productId}`} className="hover:text-blue-600">
                                  <h5 className="font-medium text-sm text-gray-900 leading-tight mb-1 hover:underline">
                                    {item.productName}
                                  </h5>
                                </Link>
                                <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                                  <Store className="w-3 h-3" />
                                  <span className="truncate">{item.shopName}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-green-600">${item.productPrice}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveFromWishlist(item.id)}
                                    disabled={removingFromWishlist === item.id}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                                  >
                                    {removingFromWishlist === item.id ? (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500"></div>
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

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
