import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { enhancedDataService } from "@/services/enhancedDataService";
import { Shop, Product } from "@/types";
import { AuthUser } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Store, 
  Package, 
  Users, 
  AlertTriangle, 
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw
} from "lucide-react";
import { AdminShopDialog } from "@/components/admin/AdminShopDialog";
import { AdminProductDialog } from "@/components/admin/AdminProductDialog";
import { AdminCustomerDialog } from "@/components/admin/AdminCustomerDialog";
import { ConfirmationDialog } from "@/components/admin/ConfirmationDialog";

const EnhancedAdminDashboard = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Search states
  const [shopSearch, setShopSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  
  // Dialog states
  const [shopDialog, setShopDialog] = useState({ isOpen: false, shop: null as Shop | null });
  const [productDialog, setProductDialog] = useState({ isOpen: false, product: null as Product | null });
  const [customerDialog, setCustomerDialog] = useState({ isOpen: false, customer: null as AuthUser | null });
  const [confirmDialog, setConfirmDialog] = useState({ 
    isOpen: false, 
    title: '', 
    description: '', 
    onConfirm: () => {} 
  });

  const [stats, setStats] = useState({
    totalShops: 0,
    totalProducts: 0,
    totalCustomers: 0,
    lowStockProducts: 0
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadShops(),
        loadProducts(),
        loadCustomers()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadShops = async () => {
    try {
      const allShops = await enhancedDataService.getShops();
      setShops(allShops);
      return allShops;
    } catch (error) {
      console.error('Error loading shops:', error);
      return [];
    }
  };

  const loadProducts = async () => {
    try {
      const allProducts = await enhancedDataService.getProducts();
      setProducts(allProducts);
      return allProducts;
    } catch (error) {
      console.error('Error loading products:', error);
      return [];
    }
  };

  const loadCustomers = async () => {
    try {
      // Mock customer data for now - replace with actual API call
      const mockCustomers: AuthUser[] = [
        { id: '1', email: 'customer1@demo.com', role: 'user', name: 'John Doe' },
        { id: '2', email: 'customer2@demo.com', role: 'user', name: 'Jane Smith' },
        { id: '3', email: 'merchant@demo.com', role: 'merchant', name: 'Merchant Demo', shop_id: 'shop_001' },
      ];
      setCustomers(mockCustomers);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalShops: shops.length,
        totalProducts: products.length,
        totalCustomers: mockCustomers.length,
        lowStockProducts: products.filter(p => p.stock > 0 && p.stock < 5).length
      }));
      
      return mockCustomers;
    } catch (error) {
      console.error('Error loading customers:', error);
      return [];
    }
  };

  // Shop CRUD operations
  const handleCreateShop = () => {
    setShopDialog({ isOpen: true, shop: null });
  };

  const handleEditShop = (shop: Shop) => {
    setShopDialog({ isOpen: true, shop });
  };

  const handleDeleteShop = (shop: Shop) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Shop',
      description: `Are you sure you want to delete "${shop.name}"? This action cannot be undone and will also delete all associated products.`,
      onConfirm: async () => {
        try {
          await enhancedDataService.deleteShop(shop.id);
          await loadShops();
          await loadProducts(); // Refresh products as they may be affected
          toast({
            title: "Success",
            description: "Shop deleted successfully."
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to delete shop. Please try again.",
            variant: "destructive"
          });
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSaveShop = async (shopData: Partial<Shop>) => {
    try {
      if (shopDialog.shop) {
        // Update existing shop
        await enhancedDataService.updateShop(shopDialog.shop.id, shopData);
        toast({
          title: "Success",
          description: "Shop updated successfully."
        });
      } else {
        // Create new shop
        await enhancedDataService.createShop(shopData);
        toast({
          title: "Success",
          description: "Shop created successfully."
        });
      }
      await loadShops();
      setShopDialog({ isOpen: false, shop: null });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save shop. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Product CRUD operations
  const handleCreateProduct = () => {
    setProductDialog({ isOpen: true, product: null });
  };

  const handleEditProduct = (product: Product) => {
    setProductDialog({ isOpen: true, product });
  };

  const handleDeleteProduct = (product: Product) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Product',
      description: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await enhancedDataService.deleteProduct(product.id);
          await loadProducts();
          toast({
            title: "Success",
            description: "Product deleted successfully."
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to delete product. Please try again.",
            variant: "destructive"
          });
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    try {
      if (productDialog.product) {
        // Update existing product
        await enhancedDataService.updateProduct(productDialog.product.id, productData);
        toast({
          title: "Success",
          description: "Product updated successfully."
        });
      } else {
        // Create new product
        await enhancedDataService.createProduct(productData);
        toast({
          title: "Success",
          description: "Product created successfully."
        });
      }
      await loadProducts();
      setProductDialog({ isOpen: false, product: null });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save product. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Customer CRUD operations
  const handleCreateCustomer = () => {
    setCustomerDialog({ isOpen: true, customer: null });
  };

  const handleEditCustomer = (customer: AuthUser) => {
    setCustomerDialog({ isOpen: true, customer });
  };

  const handleDeleteCustomer = (customer: AuthUser) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Customer',
      description: `Are you sure you want to delete "${customer.name || customer.email}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          // Mock delete - replace with actual API call
          setCustomers(prev => prev.filter(c => c.id !== customer.id));
          toast({
            title: "Success",
            description: "Customer deleted successfully."
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to delete customer. Please try again.",
            variant: "destructive"
          });
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSaveCustomer = async (customerData: Partial<AuthUser>) => {
    try {
      if (customerDialog.customer) {
        // Update existing customer
        setCustomers(prev => 
          prev.map(c => 
            c.id === customerDialog.customer!.id 
              ? { ...c, ...customerData } 
              : c
          )
        );
        toast({
          title: "Success",
          description: "Customer updated successfully."
        });
      } else {
        // Create new customer
        const newCustomer: AuthUser = {
          id: Date.now().toString(),
          ...customerData
        } as AuthUser;
        setCustomers(prev => [...prev, newCustomer]);
        toast({
          title: "Success",
          description: "Customer created successfully."
        });
      }
      setCustomerDialog({ isOpen: false, customer: null });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save customer. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Filter functions
  const filteredShops = shops.filter(shop =>
    shop.name.toLowerCase().includes(shopSearch.toLowerCase()) ||
    shop.category.toLowerCase().includes(shopSearch.toLowerCase()) ||
    shop.location.toLowerCase().includes(shopSearch.toLowerCase())
  );

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.description?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.email.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Enhanced Admin Dashboard</h1>
                <p className="text-gray-600">Full CRUD management for shops, products, and customers</p>
              </div>
            </div>
            <Button 
              onClick={loadAllData} 
              variant="outline" 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
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
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
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

        {/* Management Tabs */}
        <Tabs defaultValue="shops" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="shops">Shops Management</TabsTrigger>
            <TabsTrigger value="products">Products Management</TabsTrigger>
            <TabsTrigger value="customers">Customers Management</TabsTrigger>
          </TabsList>

          {/* Shops Tab */}
          <TabsContent value="shops">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Shops Management</CardTitle>
                    <CardDescription>Create, edit, and delete shops in the marketplace</CardDescription>
                  </div>
                  <Button onClick={handleCreateShop} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Shop
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search shops..."
                    value={shopSearch}
                    onChange={(e) => setShopSearch(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shop Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShops.map((shop) => (
                      <TableRow key={shop.id}>
                        <TableCell className="font-medium">{shop.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{shop.category}</Badge>
                        </TableCell>
                        <TableCell>{shop.location}</TableCell>
                        <TableCell>
                          <Badge variant={shop.status === 'approved' ? 'default' : 'secondary'}>
                            {shop.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {products.filter(p => p.shopId === shop.id).length}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditShop(shop)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteShop(shop)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Products Management</CardTitle>
                    <CardDescription>Create, edit, and delete products across all shops</CardDescription>
                  </div>
                  <Button onClick={handleCreateProduct} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const shop = shops.find(s => s.id === product.shopId);
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{shop?.name || 'Unknown Shop'}</TableCell>
                          <TableCell>${product.price}</TableCell>
                          <TableCell>{product.stock}</TableCell>
                          <TableCell>
                            <Badge variant={
                              product.stock === 0 
                                ? "destructive" 
                                : product.stock < 5 
                                  ? "secondary"
                                  : "default"
                            }>
                              {product.stock === 0 
                                ? 'Out of Stock' 
                                : product.stock < 5 
                                  ? 'Low Stock'
                                  : 'In Stock'
                              }
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditProduct(product)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteProduct(product)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Customers Management</CardTitle>
                    <CardDescription>Create, edit, and delete customer accounts</CardDescription>
                  </div>
                  <Button onClick={handleCreateCustomer} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Customer
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Shop ID</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name || 'N/A'}</TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell>
                          <Badge variant={customer.role === 'admin' ? 'default' : 'outline'}>
                            {customer.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{customer.shop_id || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCustomer(customer)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCustomer(customer)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <AdminShopDialog
        isOpen={shopDialog.isOpen}
        onClose={() => setShopDialog({ isOpen: false, shop: null })}
        shop={shopDialog.shop}
        onSave={handleSaveShop}
      />

      <AdminProductDialog
        isOpen={productDialog.isOpen}
        onClose={() => setProductDialog({ isOpen: false, product: null })}
        product={productDialog.product}
        shops={shops}
        onSave={handleSaveProduct}
      />

      <AdminCustomerDialog
        isOpen={customerDialog.isOpen}
        onClose={() => setCustomerDialog({ isOpen: false, customer: null })}
        customer={customerDialog.customer}
        onSave={handleSaveCustomer}
      />

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant="destructive"
        confirmText="Delete"
      />
    </div>
  );
};

export default EnhancedAdminDashboard;