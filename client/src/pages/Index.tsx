import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { useAuth } from "@/contexts/AuthContext";
import { enhancedDataService } from "@/services/enhancedDataService";
import { useProductSync, useShopSync } from "@/hooks/useRealTimeSync";
import { ProductWithShop, Shop } from "@/types";
import { Search, MapPin, Clock, ShoppingBag, Eye, Store, Settings, BarChart3, Navigation, Coffee, Gift, Smartphone, Baby, Dumbbell, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { SimpleLocationAutocomplete } from "@/components/SimpleLocationAutocomplete";

const Index = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState<ProductWithShop[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithShop[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [componentKey, setComponentKey] = useState(Date.now());
  const [isNavigationReload, setIsNavigationReload] = useState(false);
  const [nearbyShops, setNearbyShops] = useState<Shop[]>([]);
  const [userLocation, setUserLocation] = useState<string>('Mariposa, CA');
  const [locationCoordinates, setLocationCoordinates] = useState<{lat: number, lng: number} | null>(null);

  // Redirect users to their appropriate dashboards based on role
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'merchant') {
        navigate('/shop-owner-dashboard');
        return;
      }
      if (user.role === 'admin') {
        navigate('/admin-dashboard');
        return;
      }
      // Only customers (role === 'user') stay on this homepage
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    console.log('🚀 Component mounted - initial useEffect');
    // Clear any cached data to ensure fresh data loads
    localStorage.removeItem('localpick_shops');
    localStorage.removeItem('localpick_products');
    
    // Load saved location from localStorage
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      setUserLocation(savedLocation);
    }
    
    // Reset state to ensure clean start
    setProducts([]);
    setFilteredProducts([]);
    setSearchQuery("");
    setCategoryFilter("all");
    
    loadProducts();
    loadNearbyShops();
  }, []);

  useEffect(() => {
    if (!isNavigationReload) {
      filterProducts();
    }
  }, [products, searchQuery, categoryFilter, isNavigationReload]);

  const loadProducts = async () => {
    if (isLoading) {
      console.log('Already loading products, skipping...');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('🔄 loadProducts() called');
      const allProducts = await enhancedDataService.getProducts();
      const allShops = await enhancedDataService.getShops();
      
      console.log('📡 Raw API response - products:', allProducts.length, allProducts.map(p => p.id));
      console.log('📡 Raw API response - shops:', allShops.length);
      
      const productsWithShop: ProductWithShop[] = allProducts.map(product => {
        const shop = allShops.find(s => s.id === product.shopId);
        return {
          ...product,
          shop: shop!
        };
      });

      console.log('🔗 After adding shop info:', productsWithShop.length, productsWithShop.map(p => p.id));

      // Remove any potential duplicates by product ID
      const uniqueProducts = productsWithShop.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );

      console.log('✅ After deduplication:', uniqueProducts.length, uniqueProducts.map(p => p.id));
      if (allProducts.length !== uniqueProducts.length) {
        console.warn('❌ Duplicates found and removed!');
      }

      console.log('📦 Setting products state with:', uniqueProducts.length, 'products');
      setProducts(uniqueProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterProducts = () => {
    console.log('🔍 filterProducts() called with products:', products.length, products.map(p => p.id));
    let filtered = [...products];

    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.shop.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(product => product.shop.category === categoryFilter);
    }


    // Ensure no duplicates in filtered results
    const uniqueFiltered = filtered.filter((product, index, self) => 
      index === self.findIndex(p => p.id === product.id)
    );

    console.log('🎯 Filtered:', filtered.length, filtered.map(p => p.id));
    console.log('🎯 Unique filtered:', uniqueFiltered.length, uniqueFiltered.map(p => p.id));
    
    setFilteredProducts(uniqueFiltered);
  };


  const getReservationCount = () => {
    const reservations = JSON.parse(localStorage.getItem('localpick_customer_reservations') || '[]');
    return reservations.length;
  };


  const handleLocationSelect = (location: string, coordinates?: { lat: number; lng: number }) => {
    setUserLocation(location);
    if (coordinates) {
      setLocationCoordinates(coordinates);
      console.log('📍 Location with coordinates:', location, coordinates);
    }
    localStorage.setItem('userLocation', location);
    // Reload nearby shops when location changes
    loadNearbyShops();
  };

  // Calculate distance between user location and shop (placeholder)
  const calculateDistance = (userCoords: {lat: number, lng: number}, shop: any): string => {
    // In a real app, you'd calculate actual distance using haversine formula
    // For now, return mock distances
    const distances = ['0.2 mi', '0.5 mi', '0.8 mi', '1.2 mi', '1.5 mi', '2.1 mi'];
    return distances[Math.floor(Math.random() * distances.length)];
  };









  const loadNearbyShops = async () => {
    try {
      // Get all shops from database - no mock data
      const allShops = await enhancedDataService.getShops();
      console.log('📍 Loaded shops from database:', allShops.length);
      
      // Filter shops that have valid location data
      const validShops = allShops.filter(shop => 
        shop.location && 
        shop.location.trim() !== '' && 
        shop.name && 
        shop.name.trim() !== ''
      );
      
      console.log('✅ Valid shops with location data:', validShops.length);
      
      // For now, show up to 6 shops (in production, you'd calculate distance from user location)
      const nearbyShopsList = validShops.slice(0, 6).map(shop => ({
        ...shop,
        // You can add distance calculation here if you have user coordinates
        distance: locationCoordinates 
          ? calculateDistance(locationCoordinates, shop) 
          : '📍 Location-based distance coming soon'
      }));
      
      setNearbyShops(nearbyShopsList);
      console.log('🏪 Set nearby shops from database:', nearbyShopsList.length);
      
      if (nearbyShopsList.length === 0) {
        console.log('⚠️ No shops found in database with valid location data');
      }
    } catch (error) {
      console.error('Failed to load nearby shops:', error);
      setNearbyShops([]); // Clear shops on error
    }
  };

  const handleCategoryClick = (category: string) => {
    if (category === 'Coffee' || category === 'Gift') {
      setCategoryFilter(category === 'Coffee' ? 'Food' : 'Gifts');
    }
  };

  const categories = [
    { name: 'Coffee', icon: Coffee, enabled: true, filter: 'Food' },
    { name: 'Gift', icon: Gift, enabled: true, filter: 'Gifts' },
    { name: 'Electronics', icon: Smartphone, enabled: false },
    { name: 'Kids', icon: Baby, enabled: false },
    { name: 'Sports', icon: Dumbbell, enabled: false }
  ];

  return (
    <div key={componentKey} className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Compact Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                LocalPick Market
              </h1>
            </div>

            {/* Centered Search Bar with Location */}
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-3 max-w-2xl w-full">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search products, shops..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/90 border-gray-200 focus:border-blue-500 focus:ring-blue-500 h-10"
                  />
                </div>
                
                {/* Location Autocomplete Component */}
                <SimpleLocationAutocomplete
                  value={userLocation}
                  onChange={setUserLocation}
                  onLocationSelect={handleLocationSelect}
                  placeholder="Enter location..."
                  className="w-48"
                />
              </div>
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

      {/* Categories Horizontal Scroll */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-4 overflow-x-auto pb-2" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Categories:</span>
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <Button
                key={category.name}
                onClick={() => category.enabled ? handleCategoryClick(category.name) : undefined}
                variant={categoryFilter === (category.filter || category.name.toLowerCase()) ? "default" : "outline"}
                size="sm"
                className={`flex items-center gap-2 whitespace-nowrap ${
                  category.enabled 
                    ? 'hover:bg-blue-50 cursor-pointer' 
                    : 'opacity-50 cursor-not-allowed'
                }`}
                disabled={!category.enabled}
              >
                <IconComponent className="w-4 h-4" />
                {category.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Left Panel - Nearby Shops */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm sticky top-24">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg">Nearby Shops</CardTitle>
                </div>
                <CardDescription>Local businesses in your area</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {nearbyShops.map((shop: any) => (
                  <div
                    key={shop.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-gray-100 mb-2 last:mb-0"
                    onClick={() => {
                      // Search for the shop name instead of filtering
                      setSearchQuery(shop.name);
                    }}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                      <Store className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{shop.name}</h4>
                      <p className="text-sm text-gray-500 truncate">{shop.category || 'Shop'}</p>
                      {shop.distance && (
                        <p className="text-xs text-gray-400">{shop.distance}</p>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const encodedLocation = encodeURIComponent(shop.location);
                          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
                          window.open(googleMapsUrl, '_blank');
                        }}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1"
                      >
                        <Plus className="w-3 h-3" />
                        {shop.location}
                      </button>
                    </div>
                  </div>
                ))}
                {nearbyShops.length === 0 && (
                  <div className="text-center py-6">
                    <Store className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No shops found in database</p>
                    <p className="text-gray-400 text-xs mt-1">Check back later for new shops</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Products */}
          <div className="flex-1">


            {/* Products Count */}
            <div className="mb-6">
              <p className="text-gray-600">
                {isLoading ? 'Loading products...' : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} available`}
              </p>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="block"
                  >
                    <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white hover:-translate-y-1 h-full cursor-pointer">
                      {/* Image - 70% of tile */}
                      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-xl overflow-hidden">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&crop=center';
                            e.currentTarget.alt = 'Product placeholder';
                          }}
                        />
                        {product.stock === 0 && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <Badge variant="destructive" className="text-white">
                              Out of Stock
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      {/* Content - 30% of tile */}
                      <CardContent className="p-4 space-y-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-emerald-600">${product.price}</span>
                          {product.stock > 0 && product.stock <= 5 && (
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                              Only a few left!
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Store className="w-3 h-3" />
                          <span className="truncate">{product.shop.name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const encodedLocation = encodeURIComponent(product.shop.location);
                            const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
                            window.open(googleMapsUrl, '_blank');
                          }}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <Plus className="w-3 h-3" />
                          {product.shop.location}
                        </button>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg mb-4">No products found matching your criteria</p>
                  <Button 
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("all");
                    }}
                    variant="outline"
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nearby Shops (Bottom Sheet Style) */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => {
            // Could implement a bottom sheet modal for mobile
            alert('Nearby shops feature - mobile version coming soon!');
          }}
          className="rounded-full w-12 h-12 bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <Store className="w-5 h-5 text-white" />
        </Button>
      </div>



      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
              <span className="text-gray-300 text-sm">© 2024 LocalPick Market. Supporting local businesses.</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <MapPin className="w-4 h-4 text-orange-400" />
              <span className="text-sm">Serving neighborhoods across America</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
