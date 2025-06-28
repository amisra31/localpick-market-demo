
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { enhancedDataService } from "@/services/enhancedDataService";
import { useChatWebSocket } from "@/hooks/useChatWebSocket";
import { useCustomerOrderSync } from "@/hooks/useOrderWebSocket";
import { authApiService } from "@/services/authApiService";
import { useOrderCount } from "@/hooks/useOrderCount";
import { ArrowLeft, Clock, MapPin, ShoppingBag, Store, MessageSquare, X, Heart, Trash2, AlertTriangle } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";
import { AuthHeader } from "@/components/auth/AuthHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState<CustomerReservation | null>(null);
  
  // Order count hook for unified order count management
  const { activeOrderCount, decrementOrderCount, refreshOrderCount } = useOrderCount();

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
      
      // If the status is being updated to cancelled, remove it from the list
      if (updatedOrder.status === 'cancelled') {
        console.log('👤🗑️ Removing cancelled order from view:', updatedOrder.id);
        return prev.filter(res => res.id !== updatedOrder.id);
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
    
    // Also update localStorage for backward compatibility (user-specific)
    if (user) {
      const userSpecificKey = `localpick_customer_reservations_${user.id}`;
      const localReservations = JSON.parse(localStorage.getItem(userSpecificKey) || '[]');
      const updatedLocal = localReservations.map((res: any) => 
        res.id === updatedOrder.id ? { ...res, status: updatedOrder.status } : res
      );
      localStorage.setItem(userSpecificKey, JSON.stringify(updatedLocal));
    }
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
      
      // Also check localStorage for backward compatibility (user-specific key)
      const userSpecificKey = `localpick_customer_reservations_${user.id}`;
      const localReservations = JSON.parse(localStorage.getItem(userSpecificKey) || '[]');
      
      // Filter localStorage reservations to only include current user's reservations
      const filteredLocalReservations = localReservations.filter((res: any) => res.customerId === user.id);
      
      // Combine and deduplicate with better ID matching
      const allReservations = [...dbReservations, ...filteredLocalReservations];
      const uniqueReservations = allReservations.filter((reservation, index, self) => 
        index === self.findIndex(r => String(r.id) === String(reservation.id))
      );
      
      // Filter out cancelled orders and ensure all reservations belong to current user
      const activeReservations = uniqueReservations.filter(
        reservation => reservation.status !== 'cancelled' && reservation.customerId === user.id
      );
      
      setReservations(activeReservations);
    } catch (error) {
      console.error('Failed to load reservations:', error);
      // Fallback to localStorage (user-specific)
      const userSpecificKey = `localpick_customer_reservations_${user.id}`;
      const savedReservations = JSON.parse(localStorage.getItem(userSpecificKey) || '[]');
      // Filter out cancelled orders and ensure user ownership
      const activeLocalReservations = savedReservations.filter((r: any) => 
        r.status !== 'cancelled' && r.customerId === user.id
      );
      setReservations(activeLocalReservations);
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
    // Use unified order count for consistency across all pages
    return activeOrderCount;
  };

  const handleDeleteClick = (reservation: CustomerReservation) => {
    setReservationToDelete(reservation);
    setDeleteModalOpen(true);
  };

  const handleCancelReservation = async () => {
    if (!user || !reservationToDelete) return;
    
    const reservationId = reservationToDelete.id;
    setCancellingReservation(reservationId);
    
    try {
      // Check if reservation still exists in current state (prevent race conditions)
      const currentReservation = reservations.find(res => res.id === reservationId);
      if (!currentReservation) {
        console.log('Reservation already removed from local state');
        setDeleteModalOpen(false);
        setReservationToDelete(null);
        setCancellingReservation(null);
        return;
      }
      
      console.log('🗑️ Attempting to delete reservation:', {
        id: reservationId,
        userId: user.id,
        customerName: reservationToDelete.customerName,
        currentToken: localStorage.getItem('localpick_token')?.substring(0, 20) + '...'
      });
      
      // Use authenticated API service for proper token handling
      const baseUrl = window.location.origin;
      const response = await authApiService.authenticatedFetch(`${baseUrl}/api/orders/${reservationId}`, {
        method: 'DELETE'
      });
      
      console.log('🗑️ Delete API response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      
      if (response.ok) {
        console.log('🗑️✅ API deletion successful');
        
        // Remove from local state immediately for responsive UI
        setReservations(prev => prev.filter(res => res.id !== reservationId));
        
        // Also remove from localStorage (user-specific)
        const userSpecificKey = `localpick_customer_reservations_${user.id}`;
        const localReservations = JSON.parse(localStorage.getItem(userSpecificKey) || '[]');
        const updatedLocal = localReservations.filter((res: any) => res.id !== reservationId);
        localStorage.setItem(userSpecificKey, JSON.stringify(updatedLocal));
        
        // Update order count immediately for better UX
        decrementOrderCount();
        
        // Close modal and reset
        setDeleteModalOpen(false);
        setReservationToDelete(null);
        
        console.log('🗑️✅ Reservation deleted successfully');
      } else {
        const errorData = await response.json();
        console.error('🗑️❌ API deletion failed:', {
          status: response.status,
          error: errorData.error,
          reservationId
        });
        
        // Handle specific error cases
        if (response.status === 404) {
          // Order not found in database - remove from local state anyway
          console.log('🗑️🧹 Order not found in DB, cleaning up local state');
          setReservations(prev => prev.filter(res => res.id !== reservationId));
          
          const userSpecificKey = `localpick_customer_reservations_${user.id}`;
          const localReservations = JSON.parse(localStorage.getItem(userSpecificKey) || '[]');
          const updatedLocal = localReservations.filter((res: any) => res.id !== reservationId);
          localStorage.setItem(userSpecificKey, JSON.stringify(updatedLocal));
          
          setDeleteModalOpen(false);
          setReservationToDelete(null);
          
          // Refresh data to ensure consistency
          loadReservations();
          
          alert('Reservation was already removed from the system. Local data has been cleaned up.');
        } else if (response.status === 401) {
          // Authentication error - but don't force logout, just show message
          console.log('🗑️❌ 401 Authentication error - token may be expired');
          alert('Your session may have expired. Please try again in a moment, or refresh the page if the issue persists.');
        } else if (response.status === 403) {
          // Permission error
          console.log('🗑️❌ 403 Permission error');
          alert('You do not have permission to delete this reservation.');
        } else {
          // Other errors
          console.log('🗑️❌ Other error:', response.status, errorData);
          alert(`Failed to delete reservation: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('🗑️💥 Delete reservation network error:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      
      // Check if it's a network error vs other error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert('Network error. Please check your connection and try again.');
      } else if (error instanceof Error && error.message.includes('Session expired')) {
        console.log('🗑️💥 Session expired error caught - not forcing logout');
        alert('Session expired. Please try the action again.');
      } else {
        console.log('🗑️💥 Unknown error caught:', error);
        alert('Failed to delete reservation. Please try again.');
      }
    } finally {
      setCancellingReservation(null);
    }
  };

  const loadWishlist = async () => {
    if (!user) return;
    
    try {
      const baseUrl = window.location.origin;
      const response = await authApiService.authenticatedFetch(`${baseUrl}/api/customers/${user.id}/wishlist`);
      
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
      const baseUrl = window.location.origin;
      const response = await authApiService.authenticatedFetch(`${baseUrl}/api/wishlist/${wishlistItemId}`, {
        method: 'DELETE'
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
                  LocalPick
                </h1>
              </Link>
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
            {/* My Reservations Section Title */}
            <div className="flex items-center gap-2 mb-6">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">My Reservations</h3>
              <Badge variant="secondary">{reservations.length} {reservations.length > 1 ? 'items' : 'item'}</Badge>
            </div>

            {/* Reservation List - Amazon Style */}
            <div className="space-y-3">
              {reservations.map((reservation) => {
                const statusInfo = getStatusDisplay(reservation.status || 'pending');
                
                return (
                  <Card key={reservation.id} className="hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-gray-300">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
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
                                <span>Reserved {getTimeAgo(reservation.createdAt)}</span>
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
                              
                              {/* Delete Button - Always Visible */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(reservation)}
                                disabled={cancellingReservation === reservation.id || cancellingReservation !== null}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 px-2 h-7"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span className="text-xs">Delete</span>
                              </Button>
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
          <div>
            {/* No reservations message */}
            <div className="text-center py-8 mb-8">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No reservations yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                When you reserve products, they'll appear here.
              </p>
              <Link to="/">
                <Button size="sm" className="gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Browse Products
                </Button>
              </Link>
            </div>

            {/* Wishlisted Items Section */}
            {wishlistItems.length > 0 && (
              <div className="border-t pt-8">
                <div className="flex items-center gap-2 mb-6">
                  <Heart className="w-5 h-5 text-red-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Your Wishlisted Items</h3>
                  <Badge variant="secondary">{wishlistItems.length} items</Badge>
                </div>
                
                {Object.entries(groupWishlistByCategory(wishlistItems)).map(([category, items]) => (
                  <div key={category} className="mb-8">
                    <h4 className="font-medium text-gray-700 mb-4">{category}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map((item) => (
                        <Card key={item.id} className="hover:shadow-lg transition-all duration-200 border-gray-200">
                          <CardContent className="p-4">
                            <div className="relative">
                              {/* Wishlist Badge */}
                              <div className="absolute top-0 right-0 z-10">
                                <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                  <Heart className="w-3 h-3 mr-1 fill-current" />
                                  Wishlisted
                                </Badge>
                              </div>
                              
                              <Link to={`/product/${item.productId}`} className="hover:text-blue-600">
                                <h5 className="font-semibold text-gray-900 mb-1 hover:underline line-clamp-2">
                                  {item.productName}
                                </h5>
                              </Link>
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                <Store className="w-4 h-4" />
                                <span className="truncate">{item.shopName}</span>
                              </div>
                              <div className="text-lg font-bold text-green-600 mb-3">
                                ${item.productPrice}
                              </div>
                              
                              <div className="flex gap-2">
                                <Link to={`/product/${item.productId}`} className="flex-1">
                                  <Button size="sm" className="w-full">
                                    Reserve Now
                                  </Button>
                                </Link>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveFromWishlist(item.id)}
                                  disabled={removingFromWishlist === item.id}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                >
                                  {removingFromWishlist === item.id ? (
                                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Heart className="w-4 h-4" />
                                  )}
                                </Button>
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
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Delete Reservation
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Are you sure you want to delete this reservation?</p>
              {reservationToDelete && (
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">{reservationToDelete.productName}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Shop: {reservationToDelete.shopName}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    ${reservationToDelete.productPrice}
                  </div>
                </div>
              )}
              <p className="text-sm text-red-600 font-medium">
                This action cannot be undone. The reservation will be permanently removed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteModalOpen(false);
                setReservationToDelete(null);
              }}
              className="hover:bg-gray-100"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelReservation}
              disabled={cancellingReservation !== null}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cancellingReservation !== null ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete Reservation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerReservations;
