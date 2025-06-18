
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { mockDataService } from "@/services/mockData";
import { Shop, Product } from "@/types";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Edit, Trash2, LogOut, Store, Package } from "lucide-react";

const ShopOwnerDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isShopDialogOpen, setIsShopDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [shopForm, setShopForm] = useState({
    name: '',
    category: 'Food' as Shop['category'],
    location: '',
    hours: ''
  });

  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    description: '',
    stock: '',
    image: '/placeholder.svg'
  });

  useEffect(() => {
    // Check if user is authenticated and is a merchant
    if (!user || user.role !== 'merchant') {
      navigate('/login');
      return;
    }

    // Load shop data for the merchant
    const ownerShop = mockDataService.getShopByOwnerId(user.id);
    if (ownerShop) {
      setShop(ownerShop);
      setShopForm({
        name: ownerShop.name,
        category: ownerShop.category,
        location: ownerShop.location,
        hours: ownerShop.hours
      });
      loadProducts(ownerShop.id);
    }
  }, [user, navigate]);

  const loadProducts = (shopId: string) => {
    const shopProducts = mockDataService.getProductsByShopId(shopId);
    setProducts(shopProducts);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleShopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (shop) {
        // Update existing shop
        const updatedShop = mockDataService.updateShop(shop.id, shopForm);
        setShop(updatedShop);
        toast({
          title: "Shop updated successfully",
          description: "Your shop profile has been updated."
        });
      } else {
        // Create new shop
        const newShop = mockDataService.createShop({
          ...shopForm,
          ownerId: currentOwner.id
        });
        setShop(newShop);
        loadProducts(newShop.id);
        toast({
          title: "Shop created successfully",
          description: "Your shop is now live on LocalPick Market."
        });
      }
      setIsShopDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
    }
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;

    try {
      const productData = {
        ...productForm,
        shopId: shop.id,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock)
      };

      if (editingProduct) {
        mockDataService.updateProduct(editingProduct.id, productData);
        toast({
          title: "Product updated",
          description: "Product has been updated successfully."
        });
      } else {
        mockDataService.createProduct(productData);
        toast({
          title: "Product added",
          description: "New product has been added to your shop."
        });
      }

      loadProducts(shop.id);
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      setProductForm({
        name: '',
        price: '',
        description: '',
        stock: '',
        image: '/placeholder.svg'
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive"
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      description: product.description,
      stock: product.stock.toString(),
      image: product.image
    });
    setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      mockDataService.deleteProduct(productId);
      if (shop) {
        loadProducts(shop.id);
      }
      toast({
        title: "Product deleted",
        description: "Product has been removed from your shop."
      });
    }
  };

  if (!currentOwner) {
    return <div>Loading...</div>;
  }

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
                <h1 className="text-2xl font-bold">Shop Owner Dashboard</h1>
                <p className="text-gray-600">Welcome, {currentOwner.name}</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Shop Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Shop Profile</CardTitle>
                  <CardDescription>
                    {shop ? 'Manage your shop details' : 'Create your shop profile'}
                  </CardDescription>
                </div>
                <Dialog open={isShopDialogOpen} onOpenChange={setIsShopDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      {shop ? <Edit className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      {shop ? 'Edit Shop' : 'Create Shop'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{shop ? 'Edit Shop' : 'Create New Shop'}</DialogTitle>
                      <DialogDescription>
                        Fill in the details for your shop.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleShopSubmit}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="shop-name">Shop Name</Label>
                          <Input
                            id="shop-name"
                            value={shopForm.name}
                            onChange={(e) => setShopForm({...shopForm, name: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="shop-category">Category</Label>
                          <Select value={shopForm.category} onValueChange={(value: Shop['category']) => setShopForm({...shopForm, category: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Food">Food</SelectItem>
                              <SelectItem value="Gifts">Gifts</SelectItem>
                              <SelectItem value="Souvenirs">Souvenirs</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="shop-location">Location</Label>
                          <Input
                            id="shop-location"
                            value={shopForm.location}
                            onChange={(e) => setShopForm({...shopForm, location: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="shop-hours">Operating Hours</Label>
                          <Input
                            id="shop-hours"
                            placeholder="e.g., 10am–9pm"
                            value={shopForm.hours}
                            onChange={(e) => setShopForm({...shopForm, hours: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter className="mt-6">
                        <Button type="submit">
                          {shop ? 'Update Shop' : 'Create Shop'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {shop ? (
                <div className="space-y-2">
                  <p><strong>Name:</strong> {shop.name}</p>
                  <p><strong>Category:</strong> {shop.category}</p>
                  <p><strong>Location:</strong> {shop.location}</p>
                  <p><strong>Hours:</strong> {shop.hours}</p>
                </div>
              ) : (
                <p className="text-gray-500">No shop profile created yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Total Products:</strong> {products.length}</p>
                <p><strong>In Stock:</strong> {products.filter(p => p.stock > 0).length}</p>
                <p><strong>Out of Stock:</strong> {products.filter(p => p.stock === 0).length}</p>
                <p><strong>Low Stock:</strong> {products.filter(p => p.stock > 0 && p.stock < 2).length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Management */}
        {shop && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Product Inventory</CardTitle>
                  <CardDescription>Manage your products</CardDescription>
                </div>
                <Dialog 
                  open={isProductDialogOpen} 
                  onOpenChange={(open) => {
                    setIsProductDialogOpen(open);
                    if (!open) {
                      setEditingProduct(null);
                      setProductForm({
                        name: '',
                        price: '',
                        description: '',
                        stock: '',
                        image: '/placeholder.svg'
                      });
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleProductSubmit}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="product-name">Product Name</Label>
                          <Input
                            id="product-name"
                            value={productForm.name}
                            onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="product-price">Price (₹)</Label>
                          <Input
                            id="product-price"
                            type="number"
                            step="0.01"
                            value={productForm.price}
                            onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="product-stock">Stock Quantity</Label>
                          <Input
                            id="product-stock"
                            type="number"
                            min="0"
                            value={productForm.stock}
                            onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="product-description">Description</Label>
                          <Textarea
                            id="product-description"
                            value={productForm.description}
                            onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter className="mt-6">
                        <Button type="submit">
                          {editingProduct ? 'Update Product' : 'Add Product'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {products.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>₹{product.price}</TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            product.stock === 0 
                              ? 'bg-red-100 text-red-800' 
                              : product.stock < 2 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {product.stock === 0 ? 'Out of Stock' : product.stock < 2 ? 'Low Stock' : 'In Stock'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500">No products added yet.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ShopOwnerDashboard;
