
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dataService } from "@/services/dataService";
import { Shop, Product, Reservation, ReservationWithDetails } from "@/types";
import { ArrowLeft, Store, Package, ShoppingBag, AlertTriangle, Upload } from "lucide-react";
import AdminBulkUpload from "@/components/AdminBulkUpload";

const AdminDashboard = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [stats, setStats] = useState({
    totalShops: 0,
    totalProducts: 0,
    totalReservations: 0,
    lowStockProducts: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allShops = await dataService.getShops();
      const allProducts = await dataService.getProducts();
      // Note: reservations API is not yet implemented in dataService
      const allReservations: ReservationWithDetails[] = [];

      setShops(allShops);
      setProducts(allProducts);
      setReservations(allReservations);

      // Calculate stats
      setStats({
        totalShops: allShops.length,
        totalProducts: allProducts.length,
        totalReservations: allReservations.length,
        lowStockProducts: allProducts.filter(p => p.stock > 0 && p.stock < 2).length
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
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
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const handleBulkUpload = async (shops: any[], products: any[]) => {
    try {
      const response = await fetch('/api/shops/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shops, products }),
      });

      if (!response.ok) {
        throw new Error('Bulk upload failed');
      }

      const result = await response.json();
      
      // Reload data to show new shops and products
      loadData();
      
      return result;
    } catch (error) {
      console.error('Bulk upload error:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-gray-600">Monitor marketplace activity</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shops</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalShops}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reservations</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReservations}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.lowStockProducts}</div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tables */}
        <Tabs defaultValue="shops" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="shops">Shops</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="reservations">Reservations</TabsTrigger>
          </TabsList>

          <TabsContent value="shops">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Shops</CardTitle>
                    <CardDescription>
                      Manage and monitor shop activity across the marketplace
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setIsBulkUploadOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Bulk Upload
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shop Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Reservations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shops.map((shop) => (
                      <TableRow key={shop.id}>
                        <TableCell className="font-medium">{shop.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{shop.category}</Badge>
                        </TableCell>
                        <TableCell>{shop.location}</TableCell>
                        <TableCell>{shop.hours}</TableCell>
                        <TableCell>{getProductsByShop(shop.id).length}</TableCell>
                        <TableCell>{getReservationsByShop(shop.id).length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>All Products</CardTitle>
                <CardDescription>
                  Monitor product inventory and stock levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Shop</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const shop = shops.find(s => s.id === product.shopId);
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{shop?.name}</TableCell>
                          <TableCell>${product.price}</TableCell>
                          <TableCell>{product.stock}</TableCell>
                          <TableCell>
                            <Badge variant={
                              product.stock === 0 
                                ? "destructive" 
                                : product.stock < 2 
                                  ? "secondary"
                                  : "default"
                            }>
                              {product.stock === 0 
                                ? 'Out of Stock' 
                                : product.stock < 2 
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
            <Card>
              <CardHeader>
                <CardTitle>All Reservations</CardTitle>
                <CardDescription>
                  Track customer reservations and pickup status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reservations.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Shop</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Reserved</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservations.map((reservation) => (
                        <TableRow key={reservation.id}>
                          <TableCell className="font-medium">
                            {reservation.product.name}
                          </TableCell>
                          <TableCell>{reservation.shop.name}</TableCell>
                          <TableCell>{reservation.customerName}</TableCell>
                          <TableCell>{reservation.email || 'N/A'}</TableCell>
                          <TableCell>{getTimeAgo(reservation.timestamp)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Awaiting Pickup
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No reservations found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bulk Upload Dialog */}
      <AdminBulkUpload
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSave={handleBulkUpload}
      />
    </div>
  );
};

export default AdminDashboard;
