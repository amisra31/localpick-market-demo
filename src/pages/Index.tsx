
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { mockDataService } from "@/services/mockData";
import { ProductWithShop } from "@/types";
import { Search, MapPin, Clock, ShoppingBag, Eye, Store } from "lucide-react";

const Index = () => {
  const [products, setProducts] = useState<ProductWithShop[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithShop[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [shopFilter, setShopFilter] = useState("all");

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, categoryFilter, shopFilter]);

  const loadProducts = () => {
    const allProducts = mockDataService.getProducts();
    const allShops = mockDataService.getShops();
    
    const productsWithShop: ProductWithShop[] = allProducts.map(product => {
      const shop = allShops.find(s => s.id === product.shopId);
      return {
        ...product,
        shop: shop!
      };
    });

    setProducts(productsWithShop);
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

    if (shopFilter !== "all") {
      filtered = filtered.filter(product => product.shop.id === shopFilter);
    }

    setFilteredProducts(filtered);
  };

  const getUniqueShops = () => {
    const shops = new Map();
    products.forEach(product => {
      if (!shops.has(product.shop.id)) {
        shops.set(product.shop.id, product.shop);
      }
    });
    return Array.from(shops.values());
  };

  const getReservationCount = () => {
    const reservations = JSON.parse(localStorage.getItem('localpick_customer_reservations') || '[]');
    return reservations.length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  LocalPick
                </h1>
                <p className="text-sm text-gray-500">Your neighborhood marketplace</p>
              </div>
            </div>
            <Link to="/my-reservations">
              <Button variant="outline" className="gap-2 hover:bg-blue-50 transition-colors">
                <ShoppingBag className="w-4 h-4" />
                My Reservations ({getReservationCount()})
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Discover Local Products
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Browse, reserve, and pick up from your favorite neighborhood shops
          </p>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h3 className="text-2xl font-semibold text-center text-gray-900 mb-8">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Search className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Browse Local Products</h4>
              <p className="text-gray-600">Explore products from local shops in your neighborhood</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <ShoppingBag className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Reserve for Pickup</h4>
              <p className="text-gray-600">Reserve items you want and secure your purchase</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Visit Shop to Collect</h4>
              <p className="text-gray-600">Pick up your reserved items at your convenience</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8 shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Find Products</CardTitle>
            <CardDescription>Search and filter to find exactly what you're looking for</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700">Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search products or shops..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="bg-white border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Gifts">Gifts</SelectItem>
                    <SelectItem value="Souvenirs">Souvenirs</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700">Shop</label>
                <Select value={shopFilter} onValueChange={setShopFilter}>
                  <SelectTrigger className="bg-white border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shops</SelectItem>
                    {getUniqueShops().map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        {shop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="mb-6">
          <p className="text-gray-600 text-lg">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm hover:bg-white hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="aspect-square w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-20 h-20 object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                    />
                  </div>
                  <CardTitle className="text-lg leading-tight">{product.name}</CardTitle>
                  <CardDescription className="line-clamp-2 text-sm">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-green-600">${product.price}</span>
                    <Badge 
                      variant={product.stock > 0 ? "default" : "destructive"}
                      className={product.stock > 0 ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                    >
                      {product.stock > 0 ? `${product.stock} available` : "Out of Stock"}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      <span className="font-medium">{product.shop.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{product.shop.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{product.shop.hours}</span>
                    </div>
                  </div>

                  <Link to={`/product/${product.id}`} className="block">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 gap-2 group">
                      <Eye className="w-4 h-4" />
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
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
                  setShopFilter("all");
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="text-gray-600">
              © 2024 LocalPick. Supporting local businesses.
            </div>
            <div className="flex space-x-6">
              <Link to="/manage-shop" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                Manage Shop
              </Link>
              <Link to="/admin-dashboard" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                Admin Portal
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
