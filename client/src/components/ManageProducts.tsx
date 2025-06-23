import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Search } from 'lucide-react';
import { Product } from '@/types';
import { ProductActionButtons } from '@/components/ProductActionButtons';

interface ManageProductsProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onEdit: (product: Product) => void;
  onUpdate: () => void;
}

const ManageProducts: React.FC<ManageProductsProps> = ({
  isOpen,
  onClose,
  products,
  onEdit,
  onUpdate
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (stock < 5) return { label: 'Low Stock', variant: 'secondary' as const };
    return { label: 'In Stock', variant: 'default' as const };
  };

  const handleEdit = (product: Product) => {
    onEdit(product);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Products</DialogTitle>
          <DialogDescription>
            View, edit, archive, or delete your products. Use the search bar to quickly find specific products.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search products by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Product Statistics */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{products.length}</div>
              <div className="text-sm text-gray-600">Total Products</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{products.filter(p => p.stock > 0).length}</div>
              <div className="text-sm text-gray-600">In Stock</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{products.filter(p => p.stock > 0 && p.stock < 5).length}</div>
              <div className="text-sm text-gray-600">Low Stock</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{products.filter(p => p.stock === 0).length}</div>
              <div className="text-sm text-gray-600">Out of Stock</div>
            </div>
          </div>

          {/* Products Table */}
          {filteredProducts.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-[100px]">Price</TableHead>
                    <TableHead className="w-[80px]">Stock</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product.stock);
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500 truncate max-w-[300px]">
                              {product.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">₹{product.price.toFixed(2)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{product.stock}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.variant} className="text-xs">
                            {stockStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ProductActionButtons
                            product={product}
                            onEdit={handleEdit}
                            onUpdate={onUpdate}
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
            </div>
          ) : (
            <div className="text-center py-12">
              {searchQuery ? (
                <div>
                  <div className="text-gray-500 mb-2">No products found matching "{searchQuery}"</div>
                  <Button variant="outline" onClick={() => setSearchQuery('')}>
                    Clear Search
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="text-gray-500 mb-4">No products found</div>
                  <Button onClick={onClose}>
                    Add Your First Product
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Footer Info */}
          {filteredProducts.length > 0 && searchQuery && (
            <div className="text-sm text-gray-600 text-center">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageProducts;