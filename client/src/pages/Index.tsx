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
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { generatePlusCode } from "@/utils/locationUtils";

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
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  // Redirect users to their appropriate dashboards based on role
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'merchant') {
        navigate('/shop-owner-dashboard');
        return;
      }
      if (user.role === 'admin') {
        navigate('/admin-comprehensive');
        return;
      }
      // Only customers (role === 'user') stay on this homepage
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    // Clear any cached data to ensure fresh data loads
    localStorage.removeItem('localpick_shops');
    localStorage.removeItem('localpick_products');
    
    // Load saved location from localStorage
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      setUserLocation(savedLocation);
    }
    
    // Try to get user's actual location
    detectUserLocation();
    
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
      return;
    }
    
    setIsLoading(true);
    try {
      const allProducts = await enhancedDataService.getProducts();
      const allShops = await enhancedDataService.getShops();
      
      const productsWithShop: ProductWithShop[] = allProducts.map(product => {
        const shop = allShops.find(s => s.id === product.shopId);
        return {
          ...product,
          shop: shop!
        };
      });

      // Remove any potential duplicates by product ID
      const uniqueProducts = productsWithShop.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );

      setProducts(uniqueProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterProducts = () => {
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
    }
    localStorage.setItem('userLocation', location);
    // Reload nearby shops when location changes
    loadNearbyShops();
  };

  // Calculate distance between user location and shop using Haversine formula
  const calculateDistance = (userCoords: {lat: number, lng: number}, shop: any): string => {
    // For now, we'll use mock coordinates for shops since we don't have actual lat/lng in database
    // In production, you'd geocode the shop location or store lat/lng in database
    const shopCoords = getShopCoordinates(shop.location);
    
    const R = 3959; // Earth's radius in miles
    const dLat = toRad(shopCoords.lat - userCoords.lat);
    const dLon = toRad(shopCoords.lng - userCoords.lng);
    const lat1 = toRad(userCoords.lat);
    const lat2 = toRad(shopCoords.lat);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    if (distance < 1) {
      return `${(distance * 5280).toFixed(0)} ft`;
    } else {
      return `${distance.toFixed(1)} mi`;
    }
  };

  // Helper function to convert degrees to radians
  const toRad = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  // Mock function to get shop coordinates (in production, use geocoding API)
  const getShopCoordinates = (location: string): {lat: number, lng: number} => {
    // Simple hash-based coordinate generation for demo
    const hash = location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // Generate coordinates around Mariposa, CA area (37.4845, -119.9661)
    const lat = 37.4845 + (hash % 100 - 50) * 0.001;
    const lng = -119.9661 + (hash % 100 - 50) * 0.001;
    return { lat, lng };
  };

  // Helper function to get distance in miles (for sorting)
  const getDistanceInMiles = (userCoords: {lat: number, lng: number}, shop: any): number => {
    const shopCoords = getShopCoordinates(shop.location);
    
    const R = 3959; // Earth's radius in miles
    const dLat = toRad(shopCoords.lat - userCoords.lat);
    const dLon = toRad(shopCoords.lng - userCoords.lng);
    const lat1 = toRad(userCoords.lat);
    const lat2 = toRad(shopCoords.lat);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Reverse geocode coordinates to get readable address
  const reverseGeocode = async (coords: {lat: number, lng: number}): Promise<string> => {
    try {
      const response = await fetch(`/api/location/search?lat=${coords.lat}&lng=${coords.lng}&limit=1`);
      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          return results[0].description || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
        }
      }
    } catch (error) {
      console.log('❌ Reverse geocoding failed:', error);
    }
    // Fallback to coordinates if reverse geocoding fails
    return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  };

  // Detect user's geolocation
  const detectUserLocation = () => {
    if (navigator.geolocation) {
      console.log('🗺️ Attempting to detect user location...');
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('📍 User location detected:', coords);
          setLocationCoordinates(coords);
          
          // Reverse geocode to get readable address
          const address = await reverseGeocode(coords);
          console.log('🏠 Address resolved:', address);
          setUserLocation(address);
          localStorage.setItem('userLocation', address);
          localStorage.setItem('userCoordinates', JSON.stringify(coords));
          
          // Reload nearby shops with new location
          loadNearbyShops();
        },
        (error) => {
          console.log('❌ Geolocation error:', error.message);
          // Fall back to default coordinates for Mariposa, CA
          const defaultCoords = { lat: 37.4845, lng: -119.9661 };
          setLocationCoordinates(defaultCoords);
          localStorage.setItem('userCoordinates', JSON.stringify(defaultCoords));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // Cache for 5 minutes
        }
      );
    } else {
      console.log('❌ Geolocation not supported');
      // Fall back to default coordinates
      const defaultCoords = { lat: 37.4845, lng: -119.9661 };
      setLocationCoordinates(defaultCoords);
      localStorage.setItem('userCoordinates', JSON.stringify(defaultCoords));
    }
  };









  const loadNearbyShops = async () => {
    try {
      // Force fresh data by bypassing cache for nearby shops
      const response = await fetch(`/api/shops?t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch shops');
      const allShops = await response.json();
      console.log('📍 Loaded shops from database (fresh):', allShops.length);
      
      // Filter shops that have valid location data and remove duplicates
      const validShops = allShops.filter(shop => 
        shop.location && 
        shop.location.trim() !== '' && 
        shop.name && 
        shop.name.trim() !== ''
      );
      
      // Remove duplicates based on name and location combination
      const uniqueShops = validShops.filter((shop, index, self) => 
        index === self.findIndex(s => 
          s.name.toLowerCase().trim() === shop.name.toLowerCase().trim() &&
          s.location.toLowerCase().trim() === shop.location.toLowerCase().trim()
        )
      );
      
      console.log('✅ Valid shops with location data:', validShops.length);
      console.log('🔄 Unique shops after deduplication:', uniqueShops.length);
      
      // If we have user coordinates, sort by proximity; otherwise sort by most recent
      let sortedShops;
      if (locationCoordinates) {
        // Add calculated distance to each shop for sorting
        const shopsWithDistance = uniqueShops.map(shop => ({
          ...shop,
          calculatedDistance: calculateDistance(locationCoordinates, shop),
          distanceInMiles: getDistanceInMiles(locationCoordinates, shop)
        }));
        
        // Sort by actual distance
        sortedShops = shopsWithDistance.sort((a, b) => a.distanceInMiles - b.distanceInMiles);
        console.log('🔍 Shops sorted by proximity:', sortedShops.map(s => `${s.name} (${s.calculatedDistance})`));
      } else {
        // Fallback to sorting by most recent
        sortedShops = uniqueShops.sort((a, b) => b.created_at - a.created_at);
        console.log('🔍 Shops sorted by recent:', sortedShops.map(s => s.name));
      }
      
      const nearbyShopsList = sortedShops.slice(0, 10).map(shop => ({
        ...shop,
        distance: locationCoordinates 
          ? calculateDistance(locationCoordinates, shop) 
          : null
      }));
      
      // If there's a selected shop, move it to the top
      let finalShopsList = nearbyShopsList;
      if (selectedShopId) {
        const selectedShopIndex = finalShopsList.findIndex(shop => shop.id === selectedShopId);
        if (selectedShopIndex > 0) {
          const selectedShop = finalShopsList.splice(selectedShopIndex, 1)[0];
          finalShopsList.unshift(selectedShop);
        }
      }
      
      setNearbyShops(finalShopsList);
      console.log('🏪 Set nearby shops from database:', nearbyShopsList.length, nearbyShopsList.map(s => s.name));
      
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

  // Real-time sync: Reload data when products or shops are updated
  useProductSync(() => {
    console.log('🔄 Product update detected - reloading products');
    loadProducts();
  });

  useShopSync(() => {
    console.log('🔄 Shop update detected - reloading nearby shops');
    loadNearbyShops();
  });

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
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer border mb-2 last:mb-0 ${
                      selectedShopId === shop.id 
                        ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-200' 
                        : 'hover:bg-gray-50 border-gray-100'
                    }`}
                    onClick={() => {
                      // Set selected shop and search for it
                      setSelectedShopId(shop.id);
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
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const encodedLocation = encodeURIComponent(shop.location);
                            const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
                            window.open(googleMapsUrl, '_blank');
                          }}
                          className="text-xs text-gray-400 hover:text-gray-600 hover:underline text-left"
                          title="Open in Google Maps"
                        >
                          {generatePlusCode(shop.location)}
                        </button>
                      </div>
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
                        <ImageWithFallback
                          src={product.image}
                          alt={product.name}
                          width={400}
                          height={300}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
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
                          {/* Stock count hidden for customers - only show out of stock overlay above */}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Store className="w-3 h-3" />
                          <span className="truncate">{product.shop.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-3 h-3 text-gray-600" />
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              const encodedLocation = encodeURIComponent(product.shop.location);
                              const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
                              window.open(googleMapsUrl, '_blank');
                            }}
                            className="text-xs text-gray-600 hover:text-gray-800 hover:underline text-left"
                          >
                            {generatePlusCode(product.shop.location)}
                          </button>
                        </div>
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
