import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { enhancedDataService } from '@/services/enhancedDataService';

/**
 * Order status types that represent active (non-completed) orders
 */
const ACTIVE_ORDER_STATUSES = ['pending', 'reserved', 'in_progress'];

/**
 * Interface for customer orders/reservations
 */
interface CustomerOrder {
  id: string;
  productId: string;
  shopId: string;
  customerId: string;
  customerName: string;
  email?: string;
  status: 'pending' | 'reserved' | 'in_progress' | 'delivered' | 'cancelled';
  createdAt: string;
  productName: string;
  shopName: string;
  productPrice: number;
  productImage?: string;
}

/**
 * Custom hook to manage active order count with real-time updates
 * This hook provides a centralized way to get and update order counts
 * across all components while maintaining data consistency
 */
export const useOrderCount = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeOrderCount, setActiveOrderCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastFetch, setLastFetch] = useState<number>(0);

  /**
   * Fetch active order count from both API and localStorage
   * Combines data sources and deduplicates orders
   */
  const fetchActiveOrderCount = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setActiveOrderCount(0);
      return;
    }

    setIsLoading(true);
    try {
      // Load from database API
      const dbOrders = await enhancedDataService.getReservationsByCustomer(user.id);
      
      // Load from localStorage for backward compatibility (user-specific key)
      const userSpecificKey = `localpick_customer_reservations_${user.id}`;
      const localOrders = JSON.parse(localStorage.getItem(userSpecificKey) || '[]');
      
      // Filter localStorage orders to only include current user's orders
      const filteredLocalOrders = localOrders.filter((order: any) => order.customerId === user.id);
      
      // Combine and deduplicate orders
      const allOrders = [...dbOrders, ...filteredLocalOrders];
      const uniqueOrders = allOrders.filter((order, index, self) => 
        index === self.findIndex(o => String(o.id) === String(order.id))
      );
      
      // Filter for active orders only (exclude delivered and cancelled)
      const activeOrders = uniqueOrders.filter(
        order => 
          ACTIVE_ORDER_STATUSES.includes(order.status) && 
          order.customerId === user.id
      );
      
      const count = activeOrders.length;
      setActiveOrderCount(count);
      setLastFetch(Date.now());
      
      // Update localStorage cache with current active count for quick access
      localStorage.setItem(`localpick_active_count_${user.id}`, count.toString());
      
    } catch (error) {
      console.error('Error fetching active order count:', error);
      
      // Fallback to localStorage only if API fails
      try {
        const userSpecificKey = `localpick_customer_reservations_${user.id}`;
        const localOrders = JSON.parse(localStorage.getItem(userSpecificKey) || '[]');
        
        // Filter for active orders only
        const activeOrders = localOrders.filter((order: any) => 
          ACTIVE_ORDER_STATUSES.includes(order.status) && 
          order.customerId === user.id
        );
        
        setActiveOrderCount(activeOrders.length);
      } catch (localError) {
        console.error('Error reading from localStorage:', localError);
        setActiveOrderCount(0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  /**
   * Get cached order count (synchronous) for immediate use
   */
  const getCachedOrderCount = useCallback((): number => {
    if (!user) return 0;
    
    // Try to get cached count first
    const cachedCount = localStorage.getItem(`localpick_active_count_${user.id}`);
    if (cachedCount !== null) {
      return parseInt(cachedCount, 10) || 0;
    }
    
    // Fallback to current state
    return activeOrderCount;
  }, [user, activeOrderCount]);

  /**
   * Refresh order count (useful after creating/cancelling orders)
   */
  const refreshOrderCount = useCallback(() => {
    fetchActiveOrderCount();
  }, [fetchActiveOrderCount]);

  /**
   * Increment order count locally (optimistic update)
   */
  const incrementOrderCount = useCallback(() => {
    if (!user) return;
    
    const newCount = activeOrderCount + 1;
    setActiveOrderCount(newCount);
    localStorage.setItem(`localpick_active_count_${user.id}`, newCount.toString());
  }, [user, activeOrderCount]);

  /**
   * Decrement order count locally (optimistic update)
   */
  const decrementOrderCount = useCallback(() => {
    if (!user) return;
    
    const newCount = Math.max(0, activeOrderCount - 1);
    setActiveOrderCount(newCount);
    localStorage.setItem(`localpick_active_count_${user.id}`, newCount.toString());
  }, [user, activeOrderCount]);

  // Fetch order count when user changes or component mounts
  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if we have a recent cached value to show immediately
      const cachedCount = localStorage.getItem(`localpick_active_count_${user.id}`);
      if (cachedCount !== null) {
        setActiveOrderCount(parseInt(cachedCount, 10) || 0);
      }
      
      // Then fetch fresh data
      fetchActiveOrderCount();
    } else {
      setActiveOrderCount(0);
    }
  }, [isAuthenticated, user, fetchActiveOrderCount]);

  // Set up periodic refresh (every 30 seconds) to stay in sync
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const interval = setInterval(() => {
      // Only refresh if it's been more than 30 seconds since last fetch
      if (Date.now() - lastFetch > 30000) {
        fetchActiveOrderCount();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, lastFetch, fetchActiveOrderCount]);

  return {
    activeOrderCount,
    isLoading,
    getCachedOrderCount,
    refreshOrderCount,
    incrementOrderCount,
    decrementOrderCount,
    fetchActiveOrderCount
  };
};