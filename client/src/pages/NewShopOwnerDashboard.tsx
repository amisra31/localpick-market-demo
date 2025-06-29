import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { enhancedDataService } from '@/services/enhancedDataService';
import { useOrderSync, useProductSync } from '@/hooks/useRealTimeSync';
import { useMerchantOrderSync } from '@/hooks/useOrderWebSocket';
import { Shop, Product, Order } from '@/types';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  LogOut, 
  Store, 
  Package, 
  ShoppingCart, 
  MessageSquare, 
  Menu,
  X,
  CheckCircle,
  Rocket,
  TrendingUp
} from 'lucide-react';
import DashboardNavButton from '@/components/DashboardNavButton';

// Lazy load components for better performance
const ShopManagement = lazy(() => import('@/components/dashboard/ShopManagement').then(module => ({ default: module.ShopManagement })));
const InventoryManagement = lazy(() => import('@/components/dashboard/InventoryManagement').then(module => ({ default: module.InventoryManagement })));
const OrderTracking = lazy(() => import('@/components/dashboard/OrderTracking').then(module => ({ default: module.OrderTracking })));
const CustomerContact = lazy(() => import('@/components/dashboard/CustomerContact').then(module => ({ default: module.CustomerContact })));

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    <div className="space-y-4">
      <div className="h-32 bg-gray-200 rounded"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  </div>
);

type DashboardView = 'shop' | 'inventory' | 'orders' | 'contact';

const NewShopOwnerDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeView, setActiveView] = useState<DashboardView>('shop');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved view from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem('dashboard-active-view') as DashboardView;
    if (savedView && ['shop', 'inventory', 'orders', 'contact'].includes(savedView)) {
      setActiveView(savedView);
    }
  }, []);

  // Save active view to localStorage
  useEffect(() => {
    localStorage.setItem('dashboard-active-view', activeView);
  }, [activeView]);

  useEffect(() => {
    if (!user || user.role !== 'merchant') {
      navigate('/login');
      return;
    }

    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const ownerShop = await enhancedDataService.getShopForCurrentUser();
      
      if (ownerShop) {
        setShop(ownerShop);
        await loadProducts(ownerShop.id);
        await loadOrders(ownerShop.id);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async (shopId: string) => {
    try {
      console.log(`🏪📦 LOADING PRODUCTS for shop: ${shopId} (merchant: ${user?.id})`);
      const shopProducts = await enhancedDataService.getProductsByShopId(shopId);
      console.log(`🏪✅ PRODUCTS LOADED:`, {
        shopId,
        merchantId: user?.id,
        productCount: shopProducts.length,
        productIds: shopProducts.map(p => p.id),
        productNames: shopProducts.map(p => p.name)
      });
      setProducts(shopProducts);
    } catch (error) {
      console.error('🏪❌ FAILED TO LOAD PRODUCTS:', error);
    }
  };

  const loadOrders = async (shopId: string) => {
    try {
      const shopOrders = await enhancedDataService.getOrdersByShopId(shopId);
      setOrders(shopOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  // Real-time sync for products
  useProductSync((updatedProduct) => {
    if (shop && updatedProduct.shopId === shop.id) {
      setProducts(prevProducts => {
        const index = prevProducts.findIndex(p => p.id === updatedProduct.id);
        if (index >= 0) {
          const newProducts = [...prevProducts];
          newProducts[index] = updatedProduct;
          return newProducts;
        } else {
          return [...prevProducts, updatedProduct];
        }
      });
    }
  });

  // Real-time sync for orders (legacy subscription-based)
  useOrderSync((updatedOrder) => {
    if (shop && updatedOrder.shopId === shop.id) {
      setOrders(prevOrders => {
        const index = prevOrders.findIndex(o => o.id === updatedOrder.id);
        if (index >= 0) {
          const newOrders = [...prevOrders];
          newOrders[index] = updatedOrder;
          return newOrders;
        } else {
          return [...prevOrders, updatedOrder];
        }
      });
    }
  });

  // Real-time sync for orders via WebSocket
  useMerchantOrderSync(shop?.id || null, (updatedOrder) => {
    console.log('🏪🔄 Merchant received order update via WebSocket:', {
      orderId: updatedOrder.id,
      newStatus: updatedOrder.status,
      shopId: shop?.id,
      currentOrders: orders.map(o => ({ id: o.id, status: o.status })),
      timestamp: new Date().toISOString()
    });
    
    setOrders(prevOrders => {
      const index = prevOrders.findIndex(o => o.id === updatedOrder.id);
      if (index >= 0) {
        console.log(`🔄✅ Merchant updating existing order:`, {
          orderId: updatedOrder.id,
          oldStatus: prevOrders[index].status,
          newStatus: updatedOrder.status
        });
        
        const newOrders = [...prevOrders];
        newOrders[index] = updatedOrder;
        toast({
          title: "Order Updated",
          description: `Order ${updatedOrder.id} status changed to ${updatedOrder.status}`,
        });
        return newOrders;
      } else {
        console.log(`➕ Merchant adding new order:`, {
          orderId: updatedOrder.id,
          status: updatedOrder.status,
          customerName: updatedOrder.customerName
        });
        
        // New order created
        toast({
          title: "New Order",
          description: `New order received from ${updatedOrder.customerName}`,
        });
        return [...prevOrders, updatedOrder];
      }
    });
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleShopUpdate = (updatedShop: Shop) => {
    setShop(updatedShop);
    if (updatedShop.id) {
      loadProducts(updatedShop.id);
      loadOrders(updatedShop.id);
    }
  };

  const handleProductsUpdate = () => {
    if (shop) {
      loadProducts(shop.id);
    }
  };

  const handleOrdersUpdate = () => {
    if (shop) {
      loadOrders(shop.id);
    }
  };

  const getNavItemBadge = (view: DashboardView): number | undefined => {
    switch (view) {
      case 'orders':
        return orders.filter(o => o.status === 'pending').length || undefined;
      case 'inventory':
        return products.filter(p => p.stock === 0).length || undefined;
      default:
        return undefined;
    }
  };

  const getDashboardStats = () => {
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const lowStockProducts = products.filter(p => p.stock < 2 && p.stock > 0).length;
    const outOfStockProducts = products.filter(p => p.stock === 0).length;
    
    return {
      shopStatus: shop?.status || 'draft',
      totalProducts: products.length,
      totalOrders: orders.length,
      pendingOrders,
      lowStockProducts,
      outOfStockProducts,
      needsAttention: pendingOrders + outOfStockProducts
    };
  };

  const stats = getDashboardStats();

  const renderActiveView = () => {
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    switch (activeView) {
      case 'shop':
        return (
          <Suspense fallback={<LoadingSkeleton />}>
            <ShopManagement 
              shop={shop} 
              onShopUpdate={handleShopUpdate}
            />
          </Suspense>
        );
      case 'inventory':
        return (
          <Suspense fallback={<LoadingSkeleton />}>
            <InventoryManagement 
              shop={shop} 
              products={products} 
              onProductsUpdate={handleProductsUpdate}
            />
          </Suspense>
        );
      case 'orders':
        return (
          <Suspense fallback={<LoadingSkeleton />}>
            <OrderTracking 
              shop={shop} 
              orders={orders} 
              products={products}
              onOrdersUpdate={handleOrdersUpdate}
            />
          </Suspense>
        );
      case 'contact':
        return (
          <Suspense fallback={<LoadingSkeleton />}>
            <CustomerContact 
              shop={shop} 
              orders={orders}
            />
          </Suspense>
        );
      default:
        return <LoadingSkeleton />;
    }
  };

  if (!user || user.role !== 'merchant') {
    return <div>Loading...</div>;
  }

  const handleSearch = (query: string) => {
    // Implement search functionality for merchant products/orders
    console.log('Merchant search:', query);
  };

  return (
    <MerchantLayout onSearch={handleSearch}>
      <div className="min-h-screen bg-gray-50">
        {/* Dashboard Header */}
        <div className="bg-white border-b">
          <div className="app-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Merchant Dashboard</h1>
                <p className="text-muted-foreground mt-1">Welcome back, {user.name || user.email}</p>
              </div>
              
              {/* Stats Summary */}
              <div className="hidden md:flex items-center gap-6">
                {stats.needsAttention > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
                    <TrendingUp className="w-4 h-4" />
                    {stats.needsAttention} items need attention
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="app-container py-6">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Sidebar Navigation - Desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 space-y-2">
              <nav className="space-y-1" role="navigation" aria-label="Dashboard Navigation">
                <DashboardNavButton
                  icon={Store}
                  label="Manage Shop"
                  isActive={activeView === 'shop'}
                  onClick={() => setActiveView('shop')}
                  aria-label="Manage shop settings and information"
                />
                <DashboardNavButton
                  icon={Package}
                  label="Manage Inventory"
                  isActive={activeView === 'inventory'}
                  onClick={() => setActiveView('inventory')}
                  badge={getNavItemBadge('inventory')}
                  aria-label={`Manage product inventory${getNavItemBadge('inventory') ? ` (${getNavItemBadge('inventory')} items need attention)` : ''}`}
                />
                <DashboardNavButton
                  icon={ShoppingCart}
                  label="Track Orders"
                  isActive={activeView === 'orders'}
                  onClick={() => setActiveView('orders')}
                  badge={getNavItemBadge('orders')}
                  aria-label={`Track customer orders${getNavItemBadge('orders') ? ` (${getNavItemBadge('orders')} pending orders)` : ''}`}
                />
                <DashboardNavButton
                  icon={MessageSquare}
                  label="Contact Customers"
                  isActive={activeView === 'contact'}
                  onClick={() => setActiveView('contact')}
                  aria-label="Contact and communicate with customers"
                />
              </nav>

            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
              <div className="bg-white w-64 h-full shadow-lg p-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-semibold">Navigation</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <nav className="space-y-1">
                  <DashboardNavButton
                    icon={Store}
                    label="Manage Shop"
                    isActive={activeView === 'shop'}
                    onClick={() => {
                      setActiveView('shop');
                      setIsMobileMenuOpen(false);
                    }}
                  />
                  <DashboardNavButton
                    icon={Package}
                    label="Manage Inventory"
                    isActive={activeView === 'inventory'}
                    onClick={() => {
                      setActiveView('inventory');
                      setIsMobileMenuOpen(false);
                    }}
                    badge={getNavItemBadge('inventory')}
                  />
                  <DashboardNavButton
                    icon={ShoppingCart}
                    label="Track Orders"
                    isActive={activeView === 'orders'}
                    onClick={() => {
                      setActiveView('orders');
                      setIsMobileMenuOpen(false);
                    }}
                    badge={getNavItemBadge('orders')}
                  />
                  <DashboardNavButton
                    icon={MessageSquare}
                    label="Contact Customers"
                    isActive={activeView === 'contact'}
                    onClick={() => {
                      setActiveView('contact');
                      setIsMobileMenuOpen(false);
                    }}
                  />
                </nav>
                <div className="mt-6 pt-6 border-t">
                  <Button onClick={handleLogout} variant="outline" className="w-full">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="lg:col-span-4">
            {renderActiveView()}
          </div>
        </div>
        </div>
      </div>
    </MerchantLayout>
  );
};

export default NewShopOwnerDashboard;