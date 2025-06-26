import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enhancedDataService } from '@/services/enhancedDataService';
import { Shop, Product } from '@/types';
import { AuthUser } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Shop hooks
export const useShops = () => {
  return useQuery({
    queryKey: ['shops'],
    queryFn: () => enhancedDataService.getShops(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useShopMutations = () => {
  const queryClient = useQueryClient();

  const createShop = useMutation({
    mutationFn: (shopData: Partial<Shop>) => enhancedDataService.createShop(shopData),
    onSuccess: (newShop) => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      toast({
        title: "Success",
        description: `Shop "${newShop.name}" created successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create shop.",
        variant: "destructive",
      });
    },
  });

  const updateShop = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Shop> }) => 
      enhancedDataService.updateShop(id, data),
    onSuccess: (updatedShop) => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Products may reference shop
      toast({
        title: "Success",
        description: `Shop "${updatedShop.name}" updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update shop.",
        variant: "destructive",
      });
    },
  });

  const deleteShop = useMutation({
    mutationFn: (id: string) => enhancedDataService.deleteShop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Products may be affected
      toast({
        title: "Success",
        description: "Shop deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete shop.",
        variant: "destructive",
      });
    },
  });

  return {
    createShop,
    updateShop,
    deleteShop,
    isLoading: createShop.isPending || updateShop.isPending || deleteShop.isPending,
  };
};

// Product hooks
export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => enhancedDataService.getProducts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useProductMutations = () => {
  const queryClient = useQueryClient();

  const createProduct = useMutation({
    mutationFn: (productData: Partial<Product>) => enhancedDataService.createProduct(productData),
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Success",
        description: `Product "${newProduct.name}" created successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product.",
        variant: "destructive",
      });
    },
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => 
      enhancedDataService.updateProduct(id, data),
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Success",
        description: `Product "${updatedProduct.name}" updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product.",
        variant: "destructive",
      });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => enhancedDataService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Success",
        description: "Product deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product.",
        variant: "destructive",
      });
    },
  });

  return {
    createProduct,
    updateProduct,
    deleteProduct,
    isLoading: createProduct.isPending || updateProduct.isPending || deleteProduct.isPending,
  };
};

// Customer hooks (mock implementation for now)
export const useCustomers = () => {
  const [customers, setCustomers] = useState<AuthUser[]>([
    { id: '1', email: 'customer1@demo.com', role: 'user', name: 'John Doe' },
    { id: '2', email: 'customer2@demo.com', role: 'user', name: 'Jane Smith' },
    { id: '3', email: 'merchant@demo.com', role: 'merchant', name: 'Merchant Demo', shop_id: 'shop_001' },
    { id: '4', email: 'admin@demo.com', role: 'admin', name: 'Admin Demo' },
  ]);

  return {
    data: customers,
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve({ data: customers }),
  };
};

export const useCustomerMutations = () => {
  const [customers, setCustomers] = useState<AuthUser[]>([
    { id: '1', email: 'customer1@demo.com', role: 'user', name: 'John Doe' },
    { id: '2', email: 'customer2@demo.com', role: 'user', name: 'Jane Smith' },
    { id: '3', email: 'merchant@demo.com', role: 'merchant', name: 'Merchant Demo', shop_id: 'shop_001' },
    { id: '4', email: 'admin@demo.com', role: 'admin', name: 'Admin Demo' },
  ]);

  const createCustomer = {
    mutateAsync: async (customerData: Partial<AuthUser>) => {
      const newCustomer: AuthUser = {
        id: Date.now().toString(),
        email: customerData.email || '',
        role: customerData.role || 'user',
        name: customerData.name,
        shop_id: customerData.shop_id,
      };
      setCustomers(prev => [...prev, newCustomer]);
      toast({
        title: "Success",
        description: `Customer "${newCustomer.name || newCustomer.email}" created successfully.`,
      });
      return newCustomer;
    },
    isPending: false,
  };

  const updateCustomer = {
    mutateAsync: async ({ id, data }: { id: string; data: Partial<AuthUser> }) => {
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === id ? { ...customer, ...data } : customer
        )
      );
      toast({
        title: "Success",
        description: `Customer updated successfully.`,
      });
      return { id, ...data } as AuthUser;
    },
    isPending: false,
  };

  const deleteCustomer = {
    mutateAsync: async (id: string) => {
      const customer = customers.find(c => c.id === id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      toast({
        title: "Success",
        description: `Customer "${customer?.name || customer?.email}" deleted successfully.`,
      });
      return true;
    },
    isPending: false,
  };

  return {
    createCustomer,
    updateCustomer,
    deleteCustomer,
    isLoading: false,
    customers,
  };
};

// Search and filter hooks
export const useAdminSearch = <T extends { id: string }>(
  data: T[] | undefined,
  searchFields: (keyof T)[]
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState<T[]>([]);

  useEffect(() => {
    if (!data) {
      setFilteredData([]);
      return;
    }

    if (!searchQuery.trim()) {
      setFilteredData(data);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = data.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(query);
      })
    );

    setFilteredData(filtered);
  }, [data, searchQuery, searchFields]);

  return {
    searchQuery,
    setSearchQuery,
    filteredData,
  };
};

// Pagination hook
export const usePagination = <T>(data: T[], pageSize: number = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const changePageSize = useCallback((newSize: number) => {
    setItemsPerPage(newSize);
    setCurrentPage(1); // Reset to first page
  }, []);

  useEffect(() => {
    // Reset to first page if current page exceeds total pages
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  return {
    currentPage,
    totalPages,
    itemsPerPage,
    paginatedData,
    goToPage,
    changePageSize,
    totalItems: data.length,
  };
};