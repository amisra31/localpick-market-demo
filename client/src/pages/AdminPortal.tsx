
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { dataService } from "@/services/dataService";
import { Shop, Product, Reservation, ReservationWithDetails } from "@/types";
import { ArrowLeft, Store, Package, ShoppingBag, AlertTriangle, Shield, BarChart3, LogOut } from "lucide-react";

const AdminPortal = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [stats, setStats] = useState({
    totalShops: 0,
    totalProducts: 0,
    totalReservations: 0,
    lowStockProducts: 0
  });

  useEffect(() => {
    // Check if user is authenticated and is an admin
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    
    loadData();
  }, [user, navigate]);

  const loadData = () => {
    const allShops = mockDataService.getShops();
    const allProducts = mockDataService.getProducts();
    const allReservations = mockDataService.getReservations();

    const enhancedReservations: ReservationWithDetails[] = allReservations.map(reservation => {
      const product = allProducts.find(p => p.id === reservation.productId);
      const shop = allShops.find(s => s.id === reservation.shopId);
      return {
        ...reservation,
        product: product!,
        shop: shop!
      };
    });

    setShops(allShops);
    setProducts(allProducts);
    setReservations(enhancedReservations);

    setStats({
      totalShops: allShops.length,
      totalProducts: allProducts.length,
      totalReservations: allReservations.length,
      lowStockProducts: allProducts.filter(p => p.stock > 0 && p.stock < 3).length
    });
  };

  const getProductsByShop = (shopId: string) => {
    return products.filter(p => p.shopId === shopId);
  };

  const getReservationsByShop = (shopId: string) => {
    return reservations.filter(r => r.shopId === shopId);
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const reservationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - reservationTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Admin Portal</h1>
                <p className="text-gray-600">Welcome, {user?.name || user?.email}</p>
              </div>
            </div>
            <Button onClick={async () => { await signOut(); navigate('/'); }} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Shops</CardTitle>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Store className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalShops}</div>
              <p className="text-xs text-gray-500 mt-1">Active merchants</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalProducts}</div>
              <p className="text-xs text-gray-500 mt-1">Listed items</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Reservations</CardTitle>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalReservations}</div>
              <p className="text-xs text-gray-500 mt-1">Awaiting pickup</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Low Stock Alerts</CardTitle>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.lowStockProducts}</div>
              <p className="text-xs text-gray-500 mt-1">Items need restocking</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tables */}
        <Tabs defaultValue="shops" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/70 backdrop-blur-sm border-0">
            <TabsTrigger value="shops" className="data-[state=active]:bg-white">Shops</TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-white">Products</TabsTrigger>
            <TabsTrigger value="reservations" className="data-[state=active]:bg-white">Reservations</TabsTrigger>
          </TabsList>

          <TabsContent value="shops">
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <CardTitle>Shop Directory</CardTitle>
                </div>
                <CardDescription>
                  Monitor all registered shops and their performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200">
                      <TableHead className="font-semibold">Shop Name</TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">Hours</TableHead>
                      <TableHead className="font-semibold">Products</TableHead>
                      <TableHead className="font-semibold">Reservations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shops.map((shop) => (
                      <TableRow key={shop.id} className="border-gray-100">
                        <TableCell className="font-medium">{shop.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {shop.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">{shop.location}</TableCell>
                        <TableCell className="text-gray-600">{shop.hours}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-sm font-medium">
                            {getProductsByShop(shop.id).length}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 rounded-full text-sm font-medium text-green-700">
                            {getReservationsByShop(shop.id).length}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />
                  <CardTitle>Product Inventory</CardTitle>
                </div>
                <CardDescription>
                  Track all products and their stock levels across shops
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200">
                      <TableHead className="font-semibold">Product Name</TableHead>
                      <TableHead className="font-semibold">Shop</TableHead>
                      <TableHead className="font-semibold">Price</TableHead>
                      <TableHead className="font-semibold">Stock</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const shop = shops.find(s => s.id === product.shopId);
                      return (
                        <TableRow key={product.id} className="border-gray-100">
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-gray-600">{shop?.name}</TableCell>
                          <TableCell className="font-semibold text-green-600">${product.price}</TableCell>
                          <TableCell>
                            <span className="font-medium">{product.stock}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              product.stock === 0 
                                ? "destructive" 
                                : product.stock < 3 
                                  ? "secondary"
                                  : "default"
                            } className={
                              product.stock === 0 
                                ? "" 
                                : product.stock < 3 
                                  ? "bg-orange-100 text-orange-700 border-orange-200"
                                  : "bg-green-100 text-green-700 border-green-200"
                            }>
                              {product.stock === 0 
                                ? 'Out of Stock' 
                                : product.stock < 3 
                                  ? 'Low Stock'
                                  : 'In Stock'
                              }
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reservations">
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-purple-600" />
                  <CardTitle>Customer Reservations</CardTitle>
                </div>
                <CardDescription>
                  Monitor all customer reservations and pickup status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reservations.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200">
                        <TableHead className="font-semibold">Product</TableHead>
                        <TableHead className="font-semibold">Shop</TableHead>
                        <TableHead className="font-semibold">Customer</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Reserved</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservations.map((reservation) => (
                        <TableRow key={reservation.id} className="border-gray-100">
                          <TableCell className="font-medium">
                            {reservation.product.name}
                          </TableCell>
                          <TableCell className="text-gray-600">{reservation.shop.name}</TableCell>
                          <TableCell className="font-medium">{reservation.customerName}</TableCell>
                          <TableCell className="text-gray-600">{reservation.email || 'N/A'}</TableCell>
                          <TableCell className="text-gray-600">{getTimeAgo(reservation.timestamp)}</TableCell>
                          <TableCell>
                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200">
                              Awaiting Pickup
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingBag className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg">No reservations found</p>
                    <p className="text-gray-400 text-sm mt-1">Reservations will appear here as customers make them</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPortal;
