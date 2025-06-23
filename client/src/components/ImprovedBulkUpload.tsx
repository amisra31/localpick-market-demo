import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Upload, Download, Plus, Trash2, Save, X, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Product } from '@/types';

interface BulkProductData extends Omit<Product, 'id' | 'shopId'> {
  id?: string;
  errors?: string[];
  isNew?: boolean;
  isEdited?: boolean;
}

interface ImprovedBulkUploadProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  onSave: (products: BulkProductData[]) => Promise<void>;
}

const ImprovedBulkUpload: React.FC<ImprovedBulkUploadProps> = ({
  isOpen,
  onClose,
  shopId,
  onSave
}) => {
  const [products, setProducts] = useState<BulkProductData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredColumns = ['name', 'price', 'description', 'stock'];

  // Reset state when dialog closes
  const handleClose = () => {
    setProducts([]);
    setHasUploaded(false);
    onClose();
  };

  // Generate CSV template
  const generateTemplate = () => {
    const templateData = [
      {
        name: 'Sample Product 1',
        price: '19.99',
        description: 'This is a sample product description',
        stock: '10',
        image: '/placeholder.svg'
      },
      {
        name: 'Sample Product 2',
        price: '29.99', 
        description: 'Another sample product',
        stock: '5',
        image: '/placeholder.svg'
      }
    ];
    
    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Validate product data
  const validateProduct = (product: any): string[] => {
    const errors: string[] = [];
    
    if (!product.name || product.name.trim() === '') {
      errors.push('Product name is required');
    }
    
    if (!product.price || isNaN(parseFloat(product.price)) || parseFloat(product.price) <= 0) {
      errors.push('Valid price is required (must be > 0)');
    }
    
    if (!product.description || product.description.trim() === '') {
      errors.push('Description is required');
    }
    
    if (!product.stock || isNaN(parseInt(product.stock)) || parseInt(product.stock) < 0) {
      errors.push('Valid stock quantity is required (must be ≥ 0)');
    }
    
    return errors;
  };

  // Process uploaded file
  const processFile = (file: File) => {
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let data: any[] = [];
        
        if (file.name.endsWith('.csv')) {
          const csv = e.target?.result as string;
          const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
          data = parsed.data;
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const workbook = XLSX.read(e.target?.result, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          data = XLSX.utils.sheet_to_json(worksheet);
        } else {
          throw new Error('Unsupported file format. Please use CSV or Excel files.');
        }

        if (data.length === 0) {
          throw new Error('No data found in file');
        }

        // Validate columns
        const columns = Object.keys(data[0] || {});
        const missingColumns = requiredColumns.filter(col => !columns.includes(col));
        
        if (missingColumns.length > 0) {
          throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
        }

        // Process and validate data
        const processedProducts: BulkProductData[] = data.map((row) => {
          const errors = validateProduct(row);
          return {
            name: row.name || '',
            price: parseFloat(row.price) || 0,
            description: row.description || '',
            stock: parseInt(row.stock) || 0,
            image: row.image || '/placeholder.svg',
            errors,
            isNew: true,
            isEdited: false
          };
        });

        setProducts(processedProducts);
        setHasUploaded(true);
        
        const totalErrors = processedProducts.reduce((sum, p) => sum + (p.errors?.length || 0), 0);
        if (totalErrors > 0) {
          toast({
            title: 'Validation Issues Found',
            description: `${totalErrors} validation errors found. Please fix them in the table below.`,
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'File Uploaded Successfully',
            description: `${processedProducts.length} products loaded and validated.`
          });
        }

      } catch (error) {
        toast({
          title: 'Upload Failed',
          description: error instanceof Error ? error.message : 'Failed to process file',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Add new row
  const addNewRow = () => {
    const newProduct: BulkProductData = {
      name: '',
      price: 0,
      description: '',
      stock: 0,
      image: '/placeholder.svg',
      isNew: true,
      isEdited: false,
      errors: ['Product name is required', 'Valid price is required (must be > 0)', 'Description is required']
    };
    setProducts([...products, newProduct]);
    setHasUploaded(true);
  };

  // Delete row
  const deleteRow = (index: number) => {
    const updatedProducts = products.filter((_, i) => i !== index);
    setProducts(updatedProducts);
    
    if (updatedProducts.length === 0) {
      setHasUploaded(false);
    }
  };

  // Update cell value
  const updateCell = (rowIndex: number, field: string, value: string) => {
    const updatedProducts = [...products];
    const product = { ...updatedProducts[rowIndex] };
    
    if (field === 'price') {
      const numValue = parseFloat(value);
      product.price = isNaN(numValue) ? 0 : numValue;
    } else if (field === 'stock') {
      const numValue = parseInt(value);
      product.stock = isNaN(numValue) ? 0 : numValue;
    } else {
      (product as any)[field] = value;
    }
    
    product.isEdited = true;
    product.errors = validateProduct(product);
    
    updatedProducts[rowIndex] = product;
    setProducts(updatedProducts);
  };

  // Save all products
  const handleSaveAll = async () => {
    const validProducts = products.filter(p => !p.errors || p.errors.length === 0);
    
    if (validProducts.length === 0) {
      toast({
        title: 'No Valid Products',
        description: 'Please fix validation errors before saving.',
        variant: 'destructive'
      });
      return;
    }

    if (validProducts.length < products.length) {
      const hasErrors = products.some(p => p.errors && p.errors.length > 0);
      if (hasErrors) {
        toast({
          title: 'Validation Errors',
          description: 'Some products have validation errors and will be skipped.',
          variant: 'destructive'
        });
        return;
      }
    }

    try {
      setLoading(true);
      await onSave(validProducts);
      
      toast({
        title: 'Products Saved',
        description: `${validProducts.length} products saved successfully.`
      });
      
      handleClose();
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save products. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if cell has error
  const getCellError = (product: BulkProductData, field: string): boolean => {
    if (!product.errors) return false;
    
    if (field === 'name') return product.errors.some(e => e.includes('name'));
    if (field === 'price') return product.errors.some(e => e.includes('price'));
    if (field === 'description') return product.errors.some(e => e.includes('description'));
    if (field === 'stock') return product.errors.some(e => e.includes('stock'));
    
    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Products</DialogTitle>
          <DialogDescription>
            Upload multiple products via Excel/CSV file or add them manually.
          </DialogDescription>
        </DialogHeader>

        {!hasUploaded ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload File</CardTitle>
                <CardDescription>
                  Upload a CSV or Excel file with your product data. Download the template for the correct format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={generateTemplate}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Template
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {loading ? 'Processing...' : 'Choose File'}
                  </Button>
                </div>
                
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Required columns:</strong> {requiredColumns.join(', ')}</p>
                  <p><strong>Optional columns:</strong> image</p>
                  <p><strong>Supported formats:</strong> CSV, Excel (.xlsx, .xls)</p>
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <p className="text-gray-500 mb-4">Or start with an empty table</p>
              <Button onClick={addNewRow} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Products Manually
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button onClick={addNewRow} size="sm" variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Row
                </Button>
                <Button 
                  onClick={handleSaveAll} 
                  disabled={loading || products.length === 0}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleClose}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Discard
                </Button>
              </div>
              
              <div className="text-sm text-gray-600">
                <span>Products: {products.length}</span>
                <span className="ml-4">Valid: {products.filter(p => !p.errors || p.errors.length === 0).length}</span>
                <span className="ml-4 text-red-600">Errors: {products.filter(p => p.errors && p.errors.length > 0).length}</span>
              </div>
            </div>

            {products.some(p => p.errors && p.errors.length > 0) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Some products have validation errors. Click on the highlighted cells to edit and fix the issues.
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Product Name *</TableHead>
                    <TableHead className="w-[100px]">Price *</TableHead>
                    <TableHead>Description *</TableHead>
                    <TableHead className="w-[80px]">Stock *</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={product.name}
                          onChange={(e) => updateCell(index, 'name', e.target.value)}
                          placeholder="Enter product name"
                          className={`h-8 ${getCellError(product, 'name') ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={product.price || ''}
                          onChange={(e) => updateCell(index, 'price', e.target.value)}
                          placeholder="0.00"
                          className={`h-8 ${getCellError(product, 'price') ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={product.description}
                          onChange={(e) => updateCell(index, 'description', e.target.value)}
                          placeholder="Enter description"
                          className={`h-8 ${getCellError(product, 'description') ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={product.stock || ''}
                          onChange={(e) => updateCell(index, 'stock', e.target.value)}
                          placeholder="0"
                          className={`h-8 ${getCellError(product, 'stock') ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRow(index)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {products.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No products added yet. Upload a file or add products manually.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImprovedBulkUpload;