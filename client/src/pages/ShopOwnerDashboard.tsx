import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { enhancedDataService } from "@/services/enhancedDataService";
import { Shop, Product, OperatingHours, DayHours, ShopStatus, Order, OrderStatus, OrderMessage } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Edit, Trash2, LogOut, Store, Package, ChevronDown, Upload, List, Archive, Camera, Image, MapPin, Clock, Phone, Mail, Globe, Info, AlertCircle, Rocket, CheckCircle, Clock as ClockIcon, Lock, Unlock, TrendingUp, Users, Eye, Settings, ShoppingCart, MessageSquare, Search, Filter } from "lucide-react";
import ImprovedBulkUpload from "@/components/ImprovedBulkUpload";
import ManageProducts from "@/components/ManageProducts";

const ShopOwnerDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isShopDialogOpen, setIsShopDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isManageProductsOpen, setIsManageProductsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [orderMessages, setOrderMessages] = useState<OrderMessage[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  // Form states
  const defaultDayHours: DayHours = {
    isOpen: true,
    openTime: '09:00',
    closeTime: '18:00'
  };

  const defaultOperatingHours: OperatingHours = {
    monday: defaultDayHours,
    tuesday: defaultDayHours,
    wednesday: defaultDayHours,
    thursday: defaultDayHours,
    friday: defaultDayHours,
    saturday: defaultDayHours,
    sunday: { isOpen: false, openTime: '', closeTime: '' }
  };

  const [shopForm, setShopForm] = useState({
    name: '',
    category: 'Food' as Shop['category'],
    location: '',
    phone: '',
    hours: '',
    operatingHours: defaultOperatingHours,
    businessEmail: '',
    website: '',
    socialLinks: '',
    aboutShop: '',
    shopPhoto: ''
  });

  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    description: '',
    stock: '',
    image: '/placeholder.svg'
  });

  const [useLocationDetection, setUseLocationDetection] = useState(false);
  const [selectedShopImage, setSelectedShopImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const shopFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Progress tracking
  const getProgressStep = () => {
    let step = 0;
    if (shop) step = 1;
    if (products.length > 0) step = 2;
    if (shop?.status === 'pending_approval' || shop?.status === 'approved') step = 3;
    if (shop?.status === 'approved') step = 4;
    return step;
  };

  // Go Live functionality
  const canGoLive = () => {
    return shop && 
           shop.status === 'draft' && 
           products.length > 0 && 
           shop.name.trim() !== '' && 
           shop.phone.trim() !== '' && 
           shop.location.trim() !== '';
  };

  const handleGoLive = async () => {
    if (!shop || !canGoLive()) {
      toast({
        title: "Cannot Go Live",
        description: "Please ensure your shop profile is complete and you have at least one product.",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedShop = await enhancedDataService.updateShop(shop.id, { status: 'pending' });
      setShop(updatedShop);
      
      await sendAdminNotification(shop);
      
      toast({
        title: "Submission Successful!",
        description: "⏳ Your shop is under review. This usually takes 24–48 hours. You'll be notified via email once approved.",
        duration: 6000
      });
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit shop for approval",
        variant: "destructive"
      });
    }
  };

  const sendAdminNotification = async (shop: Shop) => {
    const adminEmail = {
      to: 'admin@localpick.com',
      subject: `New Shop Approval Request: ${shop.name}`,
      body: `
        A new shop has been submitted for approval:
        
        Shop Details:
        - Name: ${shop.name}
        - Category: ${shop.category}
        - Location: ${shop.location}
        - Phone: ${shop.phone}
        - Owner Email: ${user?.email}
        - Products Count: ${products.length}
        
        Please review and approve/reject this shop:
        Admin Panel: ${window.location.origin}/admin/shops/${shop.id}
        
        Submitted at: ${new Date().toLocaleString()}
      `
    };
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Admin notification sent:', adminEmail);
    return true;
  };

  const getShopStatusInfo = (status?: ShopStatus) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Draft',
          icon: <Edit className="w-4 h-4" />,
          color: 'bg-gray-100 text-gray-800',
          description: 'Complete your profile and add products to go live'
        };
      case 'pending_approval':
        return {
          label: 'Under Review',
          icon: <ClockIcon className="w-4 h-4" />,
          color: 'bg-yellow-100 text-yellow-800',
          description: 'Your shop is under review by our team'
        };
      case 'approved':
        return {
          label: 'Live',
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'bg-green-100 text-green-800',
          description: 'Your shop is live and visible to customers'
        };
      case 'rejected':
        return {
          label: 'Needs Changes',
          icon: <AlertCircle className="w-4 h-4" />,
          color: 'bg-red-100 text-red-800',
          description: 'Please address the feedback and resubmit'
        };
      default:
        return {
          label: 'Unknown',
          icon: <AlertCircle className="w-4 h-4" />,
          color: 'bg-gray-100 text-gray-800',
          description: ''
        };
    }
  };

  useEffect(() => {
    const loadShopData = async () => {
      if (!user || user.role !== 'merchant') {
        navigate('/login');
        return;
      }

      const ownerShop = await enhancedDataService.getShopByOwnerId(user.id);
    if (ownerShop) {
      setShop(ownerShop);
      setShopForm({
        name: ownerShop.name,
        category: ownerShop.category,
        location: ownerShop.location,
        phone: ownerShop.phone || '',
        hours: ownerShop.hours,
        operatingHours: ownerShop.operatingHours || defaultOperatingHours,
        businessEmail: ownerShop.businessEmail || '',
        website: ownerShop.website || '',
        socialLinks: ownerShop.socialLinks || '',
        aboutShop: ownerShop.aboutShop || '',
        shopPhoto: ownerShop.shopPhoto || ''
      });
      if (ownerShop.shopPhoto) {
        setSelectedShopImage(ownerShop.shopPhoto);
      }
      loadProducts(ownerShop.id);
      loadOrders(ownerShop.id);
    }
    };
    
    loadShopData();
  }, [user, navigate]);

  const loadProducts = async (shopId: string) => {
    try {
      const shopProducts = await enhancedDataService.getProductsByShopId(shopId);
      setProducts(shopProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    }
  };

  const loadOrders = async (shopId: string) => {
    try {
      const shopOrders = await enhancedDataService.getOrdersByShopId(shopId);
      setOrders(shopOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Additional handlers for complete functionality
  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,3}[\s\-]?[\d]{4,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (!shopForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Shop name is required.",
        variant: "destructive"
      });
      return;
    }

    if (!shopForm.phone.trim() || !validatePhone(shopForm.phone)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid phone number.",
        variant: "destructive"
      });
      return;
    }

    if (!shopForm.location.trim()) {
      toast({
        title: "Validation Error",
        description: "Location is required.",
        variant: "destructive"
      });
      return;
    }

    if (shopForm.businessEmail && !validateEmail(shopForm.businessEmail)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid business email.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (shop) {
        const updatedShop = await enhancedDataService.updateShop(shop.id, shopForm);
        setShop(updatedShop);
        toast({
          title: "Shop updated successfully",
          description: "Your shop profile has been updated."
        });
      } else {
        const newShop = await enhancedDataService.createShop({
          ...shopForm,
          ownerId: user.id
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
    
    loadProducts(shop.id);
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
      if (shop) {
        loadProducts(shop.id);
      }
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
      if (shop) {
        loadProducts(shop.id);
      }
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

  // Order management functions
  const getOrderStatusInfo = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pending',
          icon: <Clock className="w-4 h-4" />,
          color: 'bg-yellow-100 text-yellow-800',
          description: 'New order awaiting processing'
        };
      case 'in_progress':
        return {
          label: 'In Progress',
          icon: <Package className="w-4 h-4" />,
          color: 'bg-blue-100 text-blue-800',
          description: 'Order is being prepared'
        };
      case 'delivered':
        return {
          label: 'Delivered',
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'bg-green-100 text-green-800',
          description: 'Order has been delivered'
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          icon: <AlertCircle className="w-4 h-4" />,
          color: 'bg-red-100 text-red-800',
          description: 'Order was cancelled'
        };
      default:
        return {
          label: 'Unknown',
          icon: <AlertCircle className="w-4 h-4" />,
          color: 'bg-gray-100 text-gray-800',
          description: ''
        };
    }
  };

  const handleOrderStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await enhancedDataService.updateOrderStatus(orderId, newStatus);
      if (shop) {
        loadOrders(shop.id);
      }
      toast({
        title: "Order Updated",
        description: `Order status changed to ${newStatus}.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = async () => {
    if (!selectedOrder || !messageText.trim() || !user) return;

    try {
      await enhancedDataService.sendOrderMessage(
        selectedOrder.id,
        user.id,
        'merchant',
        messageText.trim()
      );
      
      setMessageText('');
      setIsMessageDialogOpen(false);
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent to the customer."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const openMessageDialog = async (order: Order) => {
    setSelectedOrder(order);
    const messages = await enhancedDataService.getOrderMessages(order.id);
    setOrderMessages(messages);
    setIsMessageDialogOpen(true);
  };

  // Filter and search orders
  const filteredOrders = orders.filter(order => {
    const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
    const matchesSearch = customerSearchTerm === '' || 
      order.customerName.toLowerCase().includes(customerSearchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Unknown Product';
  };

  if (!user || user.role !== 'merchant') {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Shop Owner Dashboard</h1>
                <p className="text-gray-600">Welcome, {user.name || user.email}</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Progress Tracker */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Your Progress</h2>
              <span className="text-sm text-gray-500">
                {getProgressStep()}/4 steps completed
              </span>
            </div>
            
            <div className="flex items-center">
              {/* Step 1 */}
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  shop ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {shop ? <CheckCircle className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                </div>
                <div className="ml-3 mr-8">
                  <p className={`text-sm font-medium ${
                    shop ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    Set up shop
                  </p>
                  <p className="text-xs text-gray-500">
                    {shop ? 'Complete' : 'Register your business'}
                  </p>
                </div>
              </div>

              {/* Connector */}
              <div className={`h-0.5 w-16 transition-colors ${
                shop && products.length > 0 ? 'bg-green-200' : shop ? 'bg-blue-200' : 'bg-gray-200'
              }`}></div>

              {/* Step 2 */}
              <div className="flex items-center ml-8">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  products.length > 0 ? 'bg-green-100 text-green-600' : 
                  shop ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {products.length > 0 ? <CheckCircle className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                </div>
                <div className="ml-3 mr-8">
                  <p className={`text-sm font-medium ${
                    products.length > 0 ? 'text-green-600' : 
                    shop ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    Add products
                  </p>
                  <p className="text-xs text-gray-500">
                    {products.length > 0 ? `${products.length} product${products.length > 1 ? 's' : ''} added` : 'Upload your inventory'}
                  </p>
                </div>
              </div>

              {/* Connector */}
              <div className={`h-0.5 w-16 transition-colors ${
                shop?.status === 'pending_approval' || shop?.status === 'approved' ? 'bg-yellow-200' : 'bg-gray-200'
              }`}></div>

              {/* Step 3 */}
              <div className="flex items-center ml-8">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  shop?.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-600' :
                  shop?.status === 'approved' ? 'bg-green-100 text-green-600' :
                  canGoLive() ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {shop?.status === 'pending_approval' ? <ClockIcon className="w-5 h-5" /> :
                   shop?.status === 'approved' ? <CheckCircle className="w-5 h-5" /> :
                   <Rocket className="w-5 h-5" />}
                </div>
                <div className="ml-3 mr-8">
                  <p className={`text-sm font-medium ${
                    shop?.status === 'pending_approval' ? 'text-yellow-600' :
                    shop?.status === 'approved' ? 'text-green-600' :
                    canGoLive() ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    Get approved
                  </p>
                  <p className="text-xs text-gray-500">
                    {shop?.status === 'pending_approval' ? 'Under review' :
                     shop?.status === 'approved' ? 'Approved!' :
                     canGoLive() ? 'Ready to submit' : 'Complete previous steps'}
                  </p>
                </div>
              </div>

              {/* Connector */}
              <div className={`h-0.5 w-16 transition-colors ${
                shop?.status === 'approved' ? 'bg-green-200' : 'bg-gray-200'
              }`}></div>

              {/* Step 4 */}
              <div className="flex items-center ml-8">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  shop?.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {shop?.status === 'approved' ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    shop?.status === 'approved' ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    Go live
                  </p>
                  <p className="text-xs text-gray-500">
                    {shop?.status === 'approved' ? 'Shop is live!' : 'Publish your shop'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Shop Profile Section */}
          {!shop ? (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-8 text-center max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Set Up Your Shop</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Create your shop profile to start selling on LocalPick Market. 
                Add your business details, contact information, and operating hours.
              </p>
              <Button 
                onClick={() => setIsShopDialogOpen(true)}
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Store className="w-5 h-5 mr-2" />
                Create Shop Profile
              </Button>
            </div>
          ) : (
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Store className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{shop.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={getShopStatusInfo(shop.status).color}
                        >
                          <span className="flex items-center gap-1">
                            {getShopStatusInfo(shop.status).icon}
                            {getShopStatusInfo(shop.status).label}
                          </span>
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsShopDialogOpen(true)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Category</p>
                    <p className="font-medium">{shop.category}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium">{shop.phone}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-gray-500">Location</p>
                    <p className="font-medium">{shop.location}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Package className="w-6 h-6" />
                  Product Inventory
                </CardTitle>
                {shop && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setIsProductDialogOpen(true)}
                      size="sm"
                      variant="outline"
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
            </CardHeader>
            <CardContent>
              {!shop ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Set up your shop first</h3>
                  <p className="text-gray-500 mb-4">
                    Create your shop profile to start adding and managing products.
                  </p>
                  <Button 
                    onClick={() => setIsShopDialogOpen(true)}
                    className="gap-2"
                  >
                    <Store className="w-4 h-4" />
                    Create Shop Profile
                  </Button>
                </div>
              ) : products.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>₹{product.price}</TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell>
                          <Badge variant={
                            product.stock === 0 ? 'destructive' : 
                            product.stock < 2 ? 'secondary' : 'default'
                          }>
                            {product.stock === 0 ? 'Out of Stock' : 
                             product.stock < 2 ? 'Low Stock' : 'In Stock'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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

          {/* Orders Section */}
          {shop && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <ShoppingCart className="w-6 h-6" />
                    Orders
                  </CardTitle>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search by customer name..."
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        className="w-64"
                      />
                    </div>
                    <Select value={orderStatusFilter} onValueChange={(value: OrderStatus | 'all') => setOrderStatusFilter(value)}>
                      <SelectTrigger className="w-40">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Orders</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredOrders.length > 0 ? (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => (
                      <Card key={order.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                            {/* Order Info */}
                            <div>
                              <h4 className="font-semibold text-lg">#{order.id.slice(-6)}</h4>
                              <p className="text-sm text-gray-600">{getProductName(order.productId)}</p>
                              <p className="text-sm text-gray-500">Qty: {order.quantity} • ${order.totalAmount}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            
                            {/* Customer Details */}
                            <div>
                              <h5 className="font-medium text-gray-900">{order.customerName}</h5>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {order.customerPhone}
                              </p>
                              <p className="text-sm text-gray-600 flex items-start gap-1 mt-1">
                                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span className="break-words">{order.deliveryAddress}</span>
                              </p>
                            </div>
                            
                            {/* Status */}
                            <div className="flex flex-col gap-2">
                              <Badge 
                                variant="outline" 
                                className={getOrderStatusInfo(order.status).color}
                              >
                                <span className="flex items-center gap-1">
                                  {getOrderStatusInfo(order.status).icon}
                                  {getOrderStatusInfo(order.status).label}
                                </span>
                              </Badge>
                              <Select 
                                value={order.status} 
                                onValueChange={(value: OrderStatus) => handleOrderStatusChange(order.id, value)}
                              >
                                <SelectTrigger className="w-full text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="delivered">Delivered</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openMessageDialog(order)}
                                className="flex-1"
                              >
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Message
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                    <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      {orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
                    </h3>
                    <p className="text-gray-500">
                      {orders.length === 0 
                        ? 'Orders will appear here when customers place them.' 
                        : 'Try adjusting your search or filter criteria.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Go Live / Status Sections - Moved to Bottom */}
          {shop && products.length > 0 && shop.status === 'draft' && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Rocket className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-800">Ready to Go Live!</h3>
                      <p className="text-sm text-green-700">
                        Your shop is complete. Submit for approval to start selling.
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleGoLive} className="bg-green-600 hover:bg-green-700">
                    <Rocket className="w-4 h-4 mr-2" />
                    Go Live
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review Status */}
          {shop?.status === 'pending_approval' && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <ClockIcon className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-yellow-800">Under Review</h3>
                    <p className="text-sm text-yellow-700">
                      Your shop is being reviewed. This usually takes 24-48 hours.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rejection Notice */}
          {shop?.status === 'rejected' && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-800">Changes Required</h3>
                    <p className="text-sm text-red-700 mb-3">
                      {shop.rejectionReason || 'Please review and update your shop details.'}
                    </p>
                    <Button 
                      onClick={handleGoLive} 
                      disabled={!canGoLive()}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      Resubmit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
        onUpdate={() => shop && loadProducts(shop.id)}
      />

      {/* Shop Creation/Edit Dialog */}
      <Dialog open={isShopDialogOpen} onOpenChange={setIsShopDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{shop ? 'Edit Shop' : 'Register New Shop'}</DialogTitle>
            <DialogDescription>
              Fill in the details for your shop. Required fields are marked with an asterisk (*).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleShopSubmit}>
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shop-name">Shop Name *</Label>
                    <Input
                      id="shop-name"
                      value={shopForm.name}
                      onChange={(e) => setShopForm({...shopForm, name: e.target.value})}
                      required
                      placeholder="Enter your shop name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shop-category">Category *</Label>
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
                </div>
                
                <div>
                  <Label htmlFor="shop-phone">Phone Number *</Label>
                  <div className="flex gap-2">
                    <Phone className="w-4 h-4 mt-3 text-gray-400" />
                    <Input
                      id="shop-phone"
                      type="tel"
                      value={shopForm.phone}
                      onChange={(e) => setShopForm({...shopForm, phone: e.target.value})}
                      required
                      placeholder="e.g., +1234567890"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Location</h3>
                
                <div>
                  <Label htmlFor="shop-location">Shop Address *</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <MapPin className="w-4 h-4 mt-3 text-gray-400" />
                      <Input
                        id="shop-location"
                        value={shopForm.location}
                        onChange={(e) => setShopForm({...shopForm, location: e.target.value})}
                        required
                        placeholder="Enter your shop address"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-gray-500 ml-6">
                      Enter your complete shop address
                    </p>
                  </div>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Operating Hours *</h3>
                
                <div>
                  <Label htmlFor="shop-hours">Operating Hours</Label>
                  <Input
                    id="shop-hours"
                    placeholder="e.g., 10am–9pm"
                    value={shopForm.hours}
                    onChange={(e) => setShopForm({...shopForm, hours: e.target.value})}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your general operating hours (e.g., "9 AM - 6 PM" or "24/7")
                  </p>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Additional Information</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="business-email">Business Email</Label>
                    <div className="flex gap-2">
                      <Mail className="w-4 h-4 mt-3 text-gray-400" />
                      <Input
                        id="business-email"
                        type="email"
                        value={shopForm.businessEmail}
                        onChange={(e) => setShopForm({...shopForm, businessEmail: e.target.value})}
                        placeholder="business@example.com"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <div className="flex gap-2">
                      <Globe className="w-4 h-4 mt-3 text-gray-400" />
                      <Input
                        id="website"
                        type="url"
                        value={shopForm.website}
                        onChange={(e) => setShopForm({...shopForm, website: e.target.value})}
                        placeholder="www.yourshop.com"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="about-shop">About Your Shop</Label>
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 mt-3 text-gray-400" />
                    <Textarea
                      id="about-shop"
                      value={shopForm.aboutShop}
                      onChange={(e) => setShopForm({...shopForm, aboutShop: e.target.value})}
                      placeholder="Tell customers about your shop, what makes it special..."
                      rows={3}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="submit" className="w-full md:w-auto">
                {shop ? 'Update Shop' : 'Register Shop'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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

      {/* Order Messaging Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Message to Customer</DialogTitle>
            <DialogDescription>
              {selectedOrder && (
                <span>
                  Order #{selectedOrder.id.slice(-6)} - {selectedOrder.customerName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {orderMessages.length > 0 && (
            <div className="max-h-40 overflow-y-auto border rounded-lg p-3 space-y-2 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700">Previous Messages:</h4>
              {orderMessages.map((msg) => (
                <div key={msg.id} className={`text-xs p-2 rounded ${
                  msg.senderType === 'merchant' 
                    ? 'bg-blue-100 text-blue-800 ml-4' 
                    : 'bg-gray-200 text-gray-800 mr-4'
                }`}>
                  <p className="font-medium">
                    {msg.senderType === 'merchant' ? 'You' : selectedOrder?.customerName}
                  </p>
                  <p>{msg.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="message-text">Your Message</Label>
              <Textarea
                id="message-text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message to the customer..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                e.g., "Hi! Unfortunately, this item is currently out of stock. We'll have more available next week."
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              className="w-full"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShopOwnerDashboard;