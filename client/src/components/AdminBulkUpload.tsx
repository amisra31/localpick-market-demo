import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Upload, Download, Plus, Trash2, Save, X, AlertCircle, Store, Package } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface BulkShopData {
  id?: string;
  shop_name: string;
  shop_category: 'Food' | 'Gifts' | 'Souvenirs' | 'Other';
  location: string;
  phone: string;
  hours: string;
  business_email?: string;
  website?: string;
  about_shop?: string;
  owner_name: string;
  owner_email: string;
  errors?: string[];
  isNew?: boolean;
  isEdited?: boolean;
}

interface BulkProductData {
  id?: string;
  shop_id?: string; // Will be generated or matched from shop data
  product_name: string;
  price: string;
  description: string;
  stock: string;
  image_url?: string;
  errors?: string[];
  isNew?: boolean;
  isEdited?: boolean;
}

interface AdminBulkUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shops: BulkShopData[], products: BulkProductData[]) => Promise<void>;
}

const AdminBulkUpload: React.FC<AdminBulkUploadProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [shops, setShops] = useState<BulkShopData[]>([]);
  const [products, setProducts] = useState<BulkProductData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [activeTab, setActiveTab] = useState('shops');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredShopColumns = ['shop_name', 'shop_category', 'location', 'phone', 'hours', 'owner_name', 'owner_email'];
  const requiredProductColumns = ['shop_id', 'product_name', 'price', 'description', 'stock'];

  // Reset state when dialog closes
  const handleClose = () => {
    setShops([]);
    setProducts([]);
    setHasUploaded(false);
    setActiveTab('shops');
    onClose();
  };

  // Generate CSV template for shops and products
  const generateTemplate = () => {
    const shopTemplateData = [
      {
        shop_name: 'Brooklyn Bites Cafe',
        shop_category: 'Food',
        location: '123 Main Street, Brooklyn, NY',
        phone: '+1-555-0123',
        hours: 'Mon-Fri: 8AM-8PM, Sat-Sun: 9AM-9PM',
        business_email: 'contact@brooklynbites.com',
        website: 'https://brooklynbites.com',
        about_shop: 'Cozy neighborhood cafe serving fresh coffee and pastries',
        owner_name: 'Sarah Johnson',
        owner_email: 'sarah@brooklynbites.com'
      },
      {
        shop_name: 'Maple Crafts Studio',
        shop_category: 'Gifts',
        location: '456 Craft Lane, Portland, OR',
        phone: '+1-555-0456',
        hours: 'Tue-Sat: 10AM-6PM, Sun: 12PM-5PM',
        business_email: 'info@maplecrafts.com',
        website: 'https://maplecrafts.com',
        about_shop: 'Handmade crafts and unique gifts by local artisans',
        owner_name: 'Mike Chen',
        owner_email: 'mike@maplecrafts.com'
      }
    ];

    const productTemplateData = [
      {
        shop_id: 'brooklyn_bites_cafe', // This should match the shop being created
        product_name: 'Artisan Coffee Blend',
        price: '12.99',
        description: 'Premium coffee blend roasted daily',
        stock: '50',
        image_url: 'https://example.com/coffee.jpg'
      },
      {
        shop_id: 'brooklyn_bites_cafe',
        product_name: 'Fresh Croissant',
        price: '3.50',
        description: 'Buttery, flaky pastry baked fresh daily',
        stock: '20',
        image_url: 'https://example.com/croissant.jpg'
      },
      {
        shop_id: 'maple_crafts_studio',
        product_name: 'Handmade Ceramic Mug',
        price: '18.99',
        description: 'Beautiful ceramic mug crafted by local artists',
        stock: '15',
        image_url: 'https://example.com/mug.jpg'
      },
      {
        shop_id: 'maple_crafts_studio',
        product_name: 'Wooden Phone Stand',
        price: '24.99',
        description: 'Elegant wooden phone stand made from sustainable maple',
        stock: '8',
        image_url: 'https://example.com/phone-stand.jpg'
      }
    ];

    // Create workbook with two sheets
    const wb = XLSX.utils.book_new();
    
    // Add shops sheet
    const shopsWS = XLSX.utils.json_to_sheet(shopTemplateData);
    XLSX.utils.book_append_sheet(wb, shopsWS, 'Shops');
    
    // Add products sheet
    const productsWS = XLSX.utils.json_to_sheet(productTemplateData);
    XLSX.utils.book_append_sheet(wb, productsWS, 'Products');
    
    // Download the file
    XLSX.writeFile(wb, 'shops_and_products_template.xlsx');
    
    toast({
      title: "Template Downloaded",
      description: "Template file with sample shops and products has been downloaded.",
    });
  };

  // Validate shop data (minimal validation - allow blank fields)
  const validateShop = (shop: any): string[] => {
    const errors: string[] = [];
    
    // Only check if we have at least a shop name to create something meaningful
    if (!shop.shop_name?.trim()) {
      errors.push('Shop name is required for creation');
    }
    
    return errors;
  };

  // Validate product data (minimal validation - allow blank fields)
  const validateProduct = (product: any): string[] => {
    const errors: string[] = [];
    
    // Only check if we have basic info to create something meaningful
    if (!product.product_name?.trim()) {
      errors.push('Product name is required for creation');
    }
    
    if (!product.shop_id?.trim()) {
      errors.push('Shop ID is required to link product to shop');
    }
    
    return errors;
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let parsedShops: any[] = [];
        let parsedProducts: any[] = [];

        if (file.name.endsWith('.csv')) {
          // Handle CSV - assume it contains both shops and products
          Papa.parse(data as string, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => {
              // Try to determine if this is shops or products based on columns
              const firstRow = result.data[0] as any;
              if (firstRow && firstRow.shop_name) {
                parsedShops = result.data as any[];
              } else if (firstRow && firstRow.product_name) {
                parsedProducts = result.data as any[];
              }
            }
          });
        } else {
          // Handle Excel with multiple sheets
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Parse shops sheet
          if (workbook.SheetNames.includes('Shops')) {
            const shopsSheet = workbook.Sheets['Shops'];
            parsedShops = XLSX.utils.sheet_to_json(shopsSheet);
          }
          
          // Parse products sheet
          if (workbook.SheetNames.includes('Products')) {
            const productsSheet = workbook.Sheets['Products'];
            parsedProducts = XLSX.utils.sheet_to_json(productsSheet);
          }
        }

        // Validate and set shops
        const validatedShops: BulkShopData[] = parsedShops.map(shop => ({
          ...shop,
          errors: validateShop(shop),
          isNew: true
        }));

        // Validate and set products
        const validatedProducts: BulkProductData[] = parsedProducts.map(product => ({
          ...product,
          errors: validateProduct(product),
          isNew: true
        }));

        setShops(validatedShops);
        setProducts(validatedProducts);
        setHasUploaded(true);

        const shopErrors = validatedShops.filter(shop => shop.errors && shop.errors.length > 0).length;
        const productErrors = validatedProducts.filter(product => product.errors && product.errors.length > 0).length;

        if (shopErrors > 0 || productErrors > 0) {
          toast({
            title: "Validation Issues Found",
            description: `${shopErrors} shops and ${productErrors} products have validation errors. Please review and fix them.`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "File Uploaded Successfully",
            description: `${validatedShops.length} shops and ${validatedProducts.length} products ready for import.`,
          });
        }

      } catch (error) {
        toast({
          title: "Upload Failed",
          description: "Failed to parse the uploaded file. Please check the format.",
          variant: "destructive"
        });
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  // Handle save
  const handleSave = async () => {
    const validShops = shops.filter(shop => !shop.errors || shop.errors.length === 0);
    const validProducts = products.filter(product => !product.errors || product.errors.length === 0);

    if (validShops.length === 0 && validProducts.length === 0) {
      toast({
        title: "No Valid Data",
        description: "Please fix validation errors before saving.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await onSave(validShops, validProducts);
      toast({
        title: "Upload Successful",
        description: `${validShops.length} shops and ${validProducts.length} products uploaded successfully and are now live.`,
      });
      handleClose();
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Bulk Upload Shops & Products
          </DialogTitle>
          <DialogDescription>
            Upload shops and their products in bulk. Download the template to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {!hasUploaded ? (
            <Card>
              <CardHeader>
                <CardTitle>Upload File</CardTitle>
                <CardDescription>
                  Upload an Excel file (.xlsx) with 'Shops' and 'Products' sheets, or separate CSV files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button onClick={generateTemplate} variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>
                  
                  <div className="flex-1">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 w-full"
                    >
                      <Upload className="h-4 w-4" />
                      Choose File
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex-1 flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="shops" className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Shops ({shops.length})
                  </TabsTrigger>
                  <TabsTrigger value="products" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Products ({products.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="shops" className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shop Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shops.map((shop, index) => (
                        <TableRow key={index} className={shop.errors && shop.errors.length > 0 ? 'bg-red-50' : ''}>
                          <TableCell>{shop.shop_name}</TableCell>
                          <TableCell>{shop.shop_category}</TableCell>
                          <TableCell>{shop.location}</TableCell>
                          <TableCell>{shop.owner_name}</TableCell>
                          <TableCell>
                            {shop.errors && shop.errors.length > 0 ? (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                {shop.errors.length} error(s)
                              </div>
                            ) : (
                              <span className="text-green-600">Valid</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="products" className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shop ID</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product, index) => (
                        <TableRow key={index} className={product.errors && product.errors.length > 0 ? 'bg-red-50' : ''}>
                          <TableCell>{product.shop_id}</TableCell>
                          <TableCell>{product.product_name}</TableCell>
                          <TableCell>${product.price}</TableCell>
                          <TableCell>{product.stock}</TableCell>
                          <TableCell>
                            {product.errors && product.errors.length > 0 ? (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                {product.errors.length} error(s)
                              </div>
                            ) : (
                              <span className="text-green-600">Valid</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-600">
                  {shops.filter(s => !s.errors || s.errors.length === 0).length} valid shops, {' '}
                  {products.filter(p => !p.errors || p.errors.length === 0).length} valid products
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading ? 'Uploading...' : 'Upload All'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminBulkUpload;