import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { enhancedDataService } from '@/services/enhancedDataService';
import { Product, Shop } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Package, Plus, Upload, List, Camera, Image, Search } from 'lucide-react';
import ImprovedBulkUpload from '@/components/ImprovedBulkUpload';
import ManageProducts from '@/components/ManageProducts';
import { ProductActionButtons } from '@/components/ProductActionButtons';

interface InventoryManagementProps {
  shop: Shop | null;
  products: Product[];
  onProductsUpdate: () => void;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({ 
  shop, 
  products, 
  onProductsUpdate 
}) => {
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isManageProductsOpen, setIsManageProductsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    description: '',
    stock: '',
    image: '/placeholder.svg'
  });

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProductSubmit = async (e: React.FormEvent) => {
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
        await enhancedDataService.updateProduct(editingProduct.id, productData);
        toast({
          title: "Product updated",
          description: "Product has been updated successfully."
        });
      } else {
        await enhancedDataService.createProduct(productData);
        toast({
          title: "Product added",
          description: "New product has been added to your shop."
        });
      }

      onProductsUpdate();
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      setProductForm({
        name: '',
        price: '',
        description: '',
        stock: '',
        image: '/placeholder.svg'
      });
      setSelectedImage(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive"
      });
    }
  };

  const handleBulkSave = async (bulkProducts: any[]): Promise<void> => {
    if (!shop) throw new Error('No shop selected');
    
    for (const product of bulkProducts) {
      try {
        const productData = {
          name: product.name,
          price: product.price,
          description: product.description,
          stock: product.stock,
          image: product.image || '/placeholder.svg',
          shopId: shop.id
        };
        
        await enhancedDataService.createProduct(productData);
      } catch (error) {
        console.error('Failed to save product:', product.name, error);
        throw new Error(`Failed to save product: ${product.name}`);
      }
    }
    
    onProductsUpdate();
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
    if (product.image && product.image !== '/placeholder.svg') {
      setSelectedImage(product.image);
    } else {
      setSelectedImage(null);
    }
    setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await enhancedDataService.deleteProduct(productId);
      onProductsUpdate();
      toast({
        title: "Product deleted",
        description: "Product has been removed from your shop."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
      });
    }
  };

  const handleArchiveProduct = async (productId: string) => {
    try {
      await enhancedDataService.archiveProduct(productId, true);
      onProductsUpdate();
      toast({
        title: "Product archived",
        description: "Product has been archived and is no longer visible to customers."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive product",
        variant: "destructive"
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive"
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedImage(result);
        setProductForm({...productForm, image: result});
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setProductForm({...productForm, image: '/placeholder.svg'});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const };
    } else if (stock < 2) {
      return { label: 'Low Stock', variant: 'secondary' as const };
    } else {
      return { label: 'In Stock', variant: 'default' as const };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Inventory</h2>
          <p className="text-gray-600">Add, edit, and manage your product catalog</p>
        </div>
        {shop && (
          <div className="flex gap-2">
            <Button 
              onClick={() => setIsProductDialogOpen(true)}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
            <Button 
              onClick={() => setIsBulkUploadOpen(true)}
              size="sm"
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            {products.length > 0 && (
              <Button 
                onClick={() => setIsManageProductsOpen(true)}
                size="sm"
                variant="outline"
              >
                <List className="w-4 h-4 mr-2" />
                Manage Products
              </Button>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Package className="w-6 h-6" />
              Product Inventory
              {products.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {products.length} products
                </Badge>
              )}
            </CardTitle>
            {products.length > 0 && (
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!shop ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Set up your shop first</h3>
              <p className="text-gray-500 mb-4">
                Create your shop profile to start adding and managing products.
              </p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product.stock);
                    return (
                      <TableRow key={product.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img 
                              src={product.image} 
                              alt={product.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {product.description}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${product.price}
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            product.stock === 0 ? 'text-red-600' : 
                            product.stock < 2 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {product.stock}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.variant}>
                            {stockStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <ProductActionButtons
                            product={product}
                            onEdit={handleEditProduct}
                            onUpdate={onProductsUpdate}
                            showEdit={true}
                            showArchive={true}
                            showDelete={true}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {searchTerm && filteredProducts.length === 0 && (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No products found</h3>
                  <p className="text-gray-500">
                    No products match your search term "{searchTerm}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No products yet</h3>
              <p className="text-gray-500 mb-4">
                Start adding products to your inventory.
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={() => setIsProductDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Product
                </Button>
                <Button 
                  onClick={() => setIsBulkUploadOpen(true)}
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ImprovedBulkUpload
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        shopId={shop?.id || ''}
        onSave={handleBulkSave}
      />

      <ManageProducts
        isOpen={isManageProductsOpen}
        onClose={() => setIsManageProductsOpen(false)}
        products={products}
        onEdit={handleEditProduct}
        onUpdate={onProductsUpdate}
      />

      {/* Product Dialog */}
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
            setSelectedImage(null);
          }
        }}
      >
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
                <Label htmlFor="product-price">Price ($)</Label>
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
              <div>
                <Label>Product Image</Label>
                <div className="space-y-3">
                  {selectedImage && (
                    <div className="relative inline-block">
                      <img
                        src={selectedImage}
                        alt="Product preview"
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={removeImage}
                      >
                        ×
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Image className="w-4 h-4" />
                      Upload Image
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Capture Image
                    </Button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  <p className="text-xs text-gray-500">
                    Supported formats: JPG, PNG, GIF (max 5MB)
                  </p>
                </div>
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
  );
};