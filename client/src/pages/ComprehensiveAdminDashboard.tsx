import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable, Column } from '@/components/admin/DataTable';
import { FormModal, FormField } from '@/components/admin/FormModal';
import { ConfirmationDialog } from '@/components/admin/ConfirmationDialog';
import AdminBulkUpload from '@/components/AdminBulkUpload';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Shop, Product } from '@/types';
import { AuthUser } from '@/contexts/AuthContext';
import {
  useShops,
  useShopMutations,
  useProducts,
  useProductMutations,
  useCustomers,
  useCustomerMutations,
  useAdminSearch,
  usePagination
} from '@/hooks/useAdminData';
import { toast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

const ComprehensiveAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'shops' | 'products' | 'customers'>('shops');
  
  // Modal states
  const [shopModal, setShopModal] = useState({ isOpen: false, data: null as Shop | null });
  const [productModal, setProductModal] = useState({ isOpen: false, data: null as Product | null });
  const [customerModal, setCustomerModal] = useState({ isOpen: false, data: null as AuthUser | null });
  const [deleteDialog, setDeleteDialog] = useState({ 
    isOpen: false, 
    type: '' as 'shop' | 'product' | 'customer',
    data: null as any,
  });
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Data hooks
  const { data: shops = [], isLoading: shopsLoading, refetch: refetchShops } = useShops();
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useProducts();
  const { data: customers = [], isLoading: customersLoading, refetch: refetchCustomers } = useCustomers();

  // Mutation hooks
  const shopMutations = useShopMutations();
  const productMutations = useProductMutations();
  const customerMutations = useCustomerMutations();

  // Search and pagination
  const { searchQuery: shopSearch, setSearchQuery: setShopSearch, filteredData: filteredShops } = 
    useAdminSearch(shops, ['name', 'category', 'location']);
  const { searchQuery: productSearch, setSearchQuery: setProductSearch, filteredData: filteredProducts } = 
    useAdminSearch(products, ['name', 'description']);
  const { searchQuery: customerSearch, setSearchQuery: setCustomerSearch, filteredData: filteredCustomers } = 
    useAdminSearch(customers, ['name', 'email']);

  const {
    currentPage: shopsPage,
    totalPages: shopsTotalPages,
    itemsPerPage: shopsPerPage,
    paginatedData: paginatedShops,
    goToPage: goToShopsPage,
    changePageSize: changeShopsPageSize,
    totalItems: totalShops
  } = usePagination(filteredShops);

  const {
    currentPage: productsPage,
    totalPages: productsTotalPages,
    itemsPerPage: productsPerPage,
    paginatedData: paginatedProducts,
    goToPage: goToProductsPage,
    changePageSize: changeProductsPageSize,
    totalItems: totalProducts
  } = usePagination(filteredProducts);

  const {
    currentPage: customersPage,
    totalPages: customersTotalPages,
    itemsPerPage: customersPerPage,
    paginatedData: paginatedCustomers,
    goToPage: goToCustomersPage,
    changePageSize: changeCustomersPageSize,
    totalItems: totalCustomers
  } = usePagination(filteredCustomers);

  // Shop configurations
  const shopColumns: Column<Shop>[] = [
    {
      key: 'shopPhoto',
      label: 'Image',
      render: (value) => (
        <Avatar className="w-12 h-12">
          <AvatarImage src={value} alt="Shop" />
          <AvatarFallback>SH</AvatarFallback>
        </Avatar>
      ),
      className: 'w-20'
    },
    { key: 'name', label: 'Shop Name', sortable: true },
    {
      key: 'category',
      label: 'Category',
      render: (value) => <Badge variant="outline">{value}</Badge>
    },
    { key: 'location', label: 'Location', className: 'max-w-xs' },
    { key: 'hours', label: 'Hours', className: 'max-w-xs' },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge variant={value === 'approved' ? 'default' : value === 'pending' ? 'secondary' : 'destructive'}>
          {value}
        </Badge>
      )
    },
  ];

  const shopFields: FormField[] = [
    { name: 'name', label: 'Shop Name', type: 'text', required: true },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      required: true,
      options: [
        { label: 'Food & Beverage', value: 'Food' },
        { label: 'Gifts & Souvenirs', value: 'Gifts' },
        { label: 'Arts & Crafts', value: 'Crafts' },
        { label: 'Clothing', value: 'Clothing' },
        { label: 'Electronics', value: 'Electronics' },
        { label: 'Books', value: 'Books' },
        { label: 'Home & Garden', value: 'Home' },
        { label: 'Other', value: 'Other' },
      ]
    },
    { name: 'location', label: 'Location', type: 'text', required: true },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'hours', label: 'Operating Hours', type: 'text', placeholder: 'e.g., Mon-Fri 9AM-6PM' },
    { name: 'businessEmail', label: 'Business Email', type: 'email' },
    { name: 'website', label: 'Website', type: 'url' },
    { name: 'shopPhoto', label: 'Shop Photo URL', type: 'url' },
    { name: 'aboutShop', label: 'About Shop', type: 'textarea', rows: 3 },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ]
    },
    { name: 'ownerId', label: 'Owner ID', type: 'text', required: true },
  ];

  // Product configurations
  const productColumns: Column<Product>[] = [
    {
      key: 'image',
      label: 'Image',
      render: (value) => (
        <Avatar className="w-12 h-12">
          <AvatarImage src={value} alt="Product" />
          <AvatarFallback>PR</AvatarFallback>
        </Avatar>
      ),
      className: 'w-20'
    },
    { key: 'name', label: 'Product Name', sortable: true },
    {
      key: 'shopId',
      label: 'Shop',
      render: (value) => {
        const shop = shops.find(s => s.id === value);
        return shop?.name || 'Unknown Shop';
      }
    },
    {
      key: 'price',
      label: 'Price',
      render: (value) => `$${value.toFixed(2)}`,
      sortable: true
    },
    {
      key: 'stock',
      label: 'Stock',
      render: (value) => (
        <Badge variant={value === 0 ? 'destructive' : value < 5 ? 'secondary' : 'default'}>
          {value} units
        </Badge>
      ),
      sortable: true
    },
  ];

  const productFields: FormField[] = [
    { name: 'name', label: 'Product Name', type: 'text', required: true },
    {
      name: 'shopId',
      label: 'Shop',
      type: 'select',
      required: true,
      options: shops.map(shop => ({ label: shop.name, value: shop.id }))
    },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    {
      name: 'price',
      label: 'Price',
      type: 'number',
      required: true,
      validation: { min: 0, max: 999999.99 }
    },
    {
      name: 'stock',
      label: 'Stock Quantity',
      type: 'number',
      required: true,
      validation: { min: 0, max: 999999 }
    },
    { name: 'image', label: 'Product Image URL', type: 'url' },
  ];

  // Customer configurations
  const customerColumns: Column<AuthUser>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'role',
      label: 'Role',
      render: (value) => (
        <Badge variant={value === 'admin' ? 'default' : value === 'merchant' ? 'secondary' : 'outline'}>
          {value}
        </Badge>
      )
    },
    { key: 'shop_id', label: 'Shop ID' },
  ];

  const customerFields: FormField[] = [
    { name: 'name', label: 'Full Name', type: 'text', required: true },
    { name: 'email', label: 'Email Address', type: 'email', required: true },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      required: true,
      options: [
        { label: 'Customer', value: 'user' },
        { label: 'Merchant', value: 'merchant' },
        { label: 'Administrator', value: 'admin' },
      ]
    },
    { name: 'shop_id', label: 'Shop ID (for merchants)', type: 'text' },
  ];

  // Event handlers
  const handleAddShop = () => setShopModal({ isOpen: true, data: null });
  const handleEditShop = (shop: Shop) => setShopModal({ isOpen: true, data: shop });
  const handleDeleteShop = (shop: Shop) => setDeleteDialog({ isOpen: true, type: 'shop', data: shop });

  const handleAddProduct = () => setProductModal({ isOpen: true, data: null });
  const handleEditProduct = (product: Product) => setProductModal({ isOpen: true, data: product });
  const handleDeleteProduct = (product: Product) => setDeleteDialog({ isOpen: true, type: 'product', data: product });

  const handleAddCustomer = () => setCustomerModal({ isOpen: true, data: null });
  const handleEditCustomer = (customer: AuthUser) => setCustomerModal({ isOpen: true, data: customer });
  const handleDeleteCustomer = (customer: AuthUser) => setDeleteDialog({ isOpen: true, type: 'customer', data: customer });

  // Submit handlers
  const handleShopSubmit = async (data: Record<string, any>) => {
    if (shopModal.data) {
      await shopMutations.updateShop.mutateAsync({ id: shopModal.data.id, data });
    } else {
      await shopMutations.createShop.mutateAsync(data);
    }
    setShopModal({ isOpen: false, data: null });
  };

  const handleProductSubmit = async (data: Record<string, any>) => {
    if (productModal.data) {
      await productMutations.updateProduct.mutateAsync({ id: productModal.data.id, data });
    } else {
      await productMutations.createProduct.mutateAsync(data);
    }
    setProductModal({ isOpen: false, data: null });
  };

  const handleCustomerSubmit = async (data: Record<string, any>) => {
    if (customerModal.data) {
      await customerMutations.updateCustomer.mutateAsync({ id: customerModal.data.id, data });
    } else {
      await customerMutations.createCustomer.mutateAsync(data);
    }
    setCustomerModal({ isOpen: false, data: null });
  };

  // Delete handlers
  const handleConfirmDelete = async () => {
    const { type, data } = deleteDialog;
    
    try {
      switch (type) {
        case 'shop':
          await shopMutations.deleteShop.mutateAsync(data.id);
          break;
        case 'product':
          await productMutations.deleteProduct.mutateAsync(data.id);
          break;
        case 'customer':
          await customerMutations.deleteCustomer.mutateAsync(data.id);
          break;
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
    
    setDeleteDialog({ isOpen: false, type: '' as any, data: null });
  };

  // Bulk upload handler
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
      refetchShops();
      refetchProducts();
      
      toast({
        title: "Bulk Upload Successful",
        description: `${result.created_shops} shops and ${result.created_products} products uploaded successfully.`,
      });
      
      return result;
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast({
        title: "Bulk Upload Failed",
        description: "Failed to upload data. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'shops':
        return (
          <DataTable
            data={paginatedShops}
            columns={shopColumns}
            isLoading={shopsLoading}
            searchPlaceholder="Search shops by name, category, or location..."
            onSearch={setShopSearch}
            onAdd={handleAddShop}
            onEdit={handleEditShop}
            onDelete={handleDeleteShop}
            onRefresh={refetchShops}
            addButtonLabel="Add Shop"
            emptyMessage="No shops found"
            totalItems={totalShops}
            currentPage={shopsPage}
            pageSize={shopsPerPage}
            onPageChange={goToShopsPage}
            onPageSizeChange={changeShopsPageSize}
          />
        );

      case 'products':
        return (
          <DataTable
            data={paginatedProducts}
            columns={productColumns}
            isLoading={productsLoading}
            searchPlaceholder="Search products by name or description..."
            onSearch={setProductSearch}
            onAdd={handleAddProduct}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
            onRefresh={refetchProducts}
            addButtonLabel="Add Product"
            emptyMessage="No products found"
            totalItems={totalProducts}
            currentPage={productsPage}
            pageSize={productsPerPage}
            onPageChange={goToProductsPage}
            onPageSizeChange={changeProductsPageSize}
          />
        );

      case 'customers':
        return (
          <DataTable
            data={paginatedCustomers}
            columns={customerColumns}
            isLoading={customersLoading}
            searchPlaceholder="Search customers by name or email..."
            onSearch={setCustomerSearch}
            onAdd={handleAddCustomer}
            onEdit={handleEditCustomer}
            onDelete={handleDeleteCustomer}
            onRefresh={refetchCustomers}
            addButtonLabel="Add Customer"
            emptyMessage="No customers found"
            totalItems={totalCustomers}
            currentPage={customersPage}
            pageSize={customersPerPage}
            onPageChange={goToCustomersPage}
            onPageSizeChange={changeCustomersPageSize}
          />
        );

      default:
        return null;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="p-6">
        {/* Bulk Upload Button for Shops Tab */}
        {activeTab === 'shops' && (
          <div className="mb-4 flex justify-end">
            <Button 
              onClick={() => setIsBulkUploadOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Upload className="h-4 w-4" />
              Bulk Upload Shops & Products
            </Button>
          </div>
        )}

        {renderContent()}

        {/* Shop Modal */}
        <FormModal
          isOpen={shopModal.isOpen}
          onClose={() => setShopModal({ isOpen: false, data: null })}
          title={shopModal.data ? 'Edit Shop' : 'Create New Shop'}
          description={shopModal.data ? 'Update shop information and settings.' : 'Add a new shop to the marketplace.'}
          fields={shopFields}
          initialData={shopModal.data || {}}
          onSubmit={handleShopSubmit}
          submitLabel={shopModal.data ? 'Update Shop' : 'Create Shop'}
          isLoading={shopMutations.isLoading}
        />

        {/* Product Modal */}
        <FormModal
          isOpen={productModal.isOpen}
          onClose={() => setProductModal({ isOpen: false, data: null })}
          title={productModal.data ? 'Edit Product' : 'Create New Product'}
          description={productModal.data ? 'Update product information and inventory.' : 'Add a new product to a shop.'}
          fields={productFields}
          initialData={productModal.data || {}}
          onSubmit={handleProductSubmit}
          submitLabel={productModal.data ? 'Update Product' : 'Create Product'}
          isLoading={productMutations.isLoading}
        />

        {/* Customer Modal */}
        <FormModal
          isOpen={customerModal.isOpen}
          onClose={() => setCustomerModal({ isOpen: false, data: null })}
          title={customerModal.data ? 'Edit Customer' : 'Create New Customer'}
          description={customerModal.data ? 'Update customer information and role.' : 'Add a new customer to the system.'}
          fields={customerFields}
          initialData={customerModal.data || {}}
          onSubmit={handleCustomerSubmit}
          submitLabel={customerModal.data ? 'Update Customer' : 'Create Customer'}
          isLoading={customerMutations.isLoading}
        />

        {/* Delete Confirmation */}
        <ConfirmationDialog
          isOpen={deleteDialog.isOpen}
          onClose={() => setDeleteDialog({ isOpen: false, type: '' as any, data: null })}
          onConfirm={handleConfirmDelete}
          title={`Delete ${deleteDialog.type}`}
          description={`Are you sure you want to delete this ${deleteDialog.type}? This action cannot be undone.`}
          confirmText="Delete"
          variant="destructive"
        />

        {/* Bulk Upload Dialog */}
        <AdminBulkUpload
          isOpen={isBulkUploadOpen}
          onClose={() => setIsBulkUploadOpen(false)}
          onSave={handleBulkUpload}
        />
      </div>
    </AdminLayout>
  );
};

export default ComprehensiveAdminDashboard;