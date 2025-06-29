import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { enhancedDataService } from "@/services/enhancedDataService";
import { useChatThreads } from "@/hooks/useChatThreads";
import { Product, Shop } from "@/types";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Clock, ShoppingBag, ExternalLink, LogIn, Navigation, Heart, Share, Copy, Check, Search, MessageSquare } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { CustomerMerchantChat } from "@/components/CustomerMerchantChat";
import { generatePlusCode, copyToClipboard, openDirections, shareProduct, generateMapEmbedUrl } from "@/utils/locationUtils";
import { useOrderCount } from "@/hooks/useOrderCount";
import { ChatButton } from "@/components/ui/ChatButton";
import { GoogleMap } from "@/components/GoogleMap";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { authApiService } from "@/services/authApiService";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [isReserveDialogOpen, setIsReserveDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [plusCodeCopied, setPlusCodeCopied] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Chat threads for unread count
  const { getTotalUnreadCount } = useChatThreads();
  
  // Order count hook for unified order count management
  const { activeOrderCount, incrementOrderCount, refreshOrderCount } = useOrderCount();

  const getReservationCount = () => {
    return activeOrderCount;
  };

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    loadProductData();
  }, [id, navigate]);

  useEffect(() => {
    if (user && product) {
      checkWishlistStatus();
    }
  }, [user, product]);

  const loadProductData = async () => {
    try {
      const foundProduct = await enhancedDataService.getProductById(id!);
      if (!foundProduct) {
        navigate('/');
        return;
      }

      const foundShop = await enhancedDataService.getShopById(foundProduct.shopId);
      if (!foundShop) {
        navigate('/');
        return;
      }

      setProduct(foundProduct);
      setShop(foundShop);
    } catch (error) {
      console.error('Failed to load product data:', error);
      navigate('/');
    }
  };

  useEffect(() => {
    // Auto-fill email and name if user is logged in
    if (user) {
      setCustomerEmail(user.email);
      setCustomerName(user.name || user.email.split('@')[0]);
    }
  }, [user]);

  const handleReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !shop || !customerName.trim()) return;

    try {
      // Create reservation in database
      const reservation = await enhancedDataService.createReservation({
        productId: product.id,
        shopId: shop.id,
        customerName: customerName.trim(),
        email: customerEmail.trim() || undefined,
        customerId: user?.id || `guest_${Date.now()}`
      });

      // Also store in localStorage for backward compatibility with customer reservations page (user-specific)
      const userSpecificKey = `localpick_customer_reservations_${user?.id || 'guest'}`;
      const existingReservations = JSON.parse(localStorage.getItem(userSpecificKey) || '[]');
      existingReservations.push({
        id: reservation.id,
        productId: product.id,
        shopId: shop.id,
        customerId: user?.id || `guest_${Date.now()}`,
        customerName: customerName.trim(),
        email: customerEmail.trim() || undefined,
        timestamp: reservation.createdAt,
        productName: product.name,
        shopName: shop.name
      });
      localStorage.setItem(userSpecificKey, JSON.stringify(existingReservations));

      // Update product stock in state
      setProduct(prev => prev ? { ...prev, stock: prev.stock - 1 } : null);

      toast({
        title: "Reservation successful!",
        description: `${product.name} has been reserved for pickup at ${shop.name}.`
      });

      // Update order count immediately for better UX
      incrementOrderCount();

      setIsReserveDialogOpen(false);
      setCustomerName("");
      setCustomerEmail("");
    } catch (error) {
      toast({
        title: "Reservation failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
    }
  };

  const openGoogleMaps = (location: string) => {
    const encodedLocation = encodeURIComponent(location);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
    window.open(googleMapsUrl, '_blank');
  };

  const handleCopyAddress = async () => {
    if (!shop) return;
    const success = await copyToClipboard(shop.location);
    if (success) {
      setAddressCopied(true);
      toast({ title: "Address copied to clipboard" });
      setTimeout(() => setAddressCopied(false), 2000);
    }
  };

  const handleCopyPlusCode = async () => {
    if (!shop) return;
    const plusCode = generatePlusCode(shop.location);
    const success = await copyToClipboard(plusCode);
    if (success) {
      setPlusCodeCopied(true);
      toast({ title: "Plus Code copied to clipboard" });
      setTimeout(() => setPlusCodeCopied(false), 2000);
    }
  };

  const handleGetDirections = () => {
    if (!shop) return;
    openDirections(shop.location);
  };

  const checkWishlistStatus = async () => {
    if (!user || !product) return;
    
    try {
      const response = await authApiService.authenticatedFetch(`/api/customers/${user.id}/wishlist`);
      
      if (response.ok) {
        const wishlistItems = await response.json();
        const isProductWishlisted = wishlistItems.some((item: any) => item.productId === product.id);
        setIsWishlisted(isProductWishlisted);
      }
    } catch (error) {
      console.error('Failed to check wishlist status:', error);
    }
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated || !user) {
      navigate('/login', { state: { from: `/product/${product?.id}` } });
      return;
    }
    if (!product || !shop) return;

    try {
      if (isWishlisted) {
        // Remove from wishlist - use product ID to find and delete
        const response = await authApiService.authenticatedFetch(`/api/customers/${user.id}/wishlist/product/${product.id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setIsWishlisted(false);
          toast({
            title: "Removed from wishlist",
            description: "Product removed from your wishlist"
          });
        }
      } else {
        // Add to wishlist
        const response = await authApiService.authenticatedFetch(`/api/customers/${user.id}/wishlist`, {
          method: 'POST',
          body: JSON.stringify({
            productId: product.id,
            shopId: shop.id
          })
        });
        
        if (response.ok) {
          setIsWishlisted(true);
          toast({
            title: "Added to wishlist",
            description: "Product saved to your wishlist"
          });
        }
      }
    } catch (error) {
      console.error('Wishlist error:', error);
      toast({
        title: "Error",
        description: "Failed to update wishlist",
        variant: "destructive"
      });
    }
  };

  const handleShareProduct = async () => {
    if (!product || !shop) return;
    const success = await shareProduct(product, shop);
    if (!success) {
      toast({ 
        title: "Failed to share", 
        description: "Please try again",
        variant: "destructive" 
      });
    }
    // No success toast - let the native share UI handle the feedback
  };

  const handleChatWithMerchant = () => {
    if (!isAuthenticated || !user) {
      navigate('/login', { state: { from: `/product/${product?.id}` } });
      return;
    }
    setIsChatOpen(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (!product || !shop) {
    return <div>Loading...</div>;
  }

  const isOutOfStock = product.stock <= 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Consistent Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  LocalPick
                </h1>
              </Link>
            </div>

            {/* Center - Search Bar */}
            <div className="flex-1 flex justify-center">
              <div className="max-w-2xl w-full">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search products, shops..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/90 border-gray-200 focus:border-blue-500 focus:ring-blue-500 h-10"
                  />
                </form>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-3">
              {isAuthenticated && (
                <>
                  <ChatButton size="sm" />
                  <Link 
                    to="/my-reservations"
                    state={{ from: `/product/${product.id}` }}
                  >
                    <Button variant="outline" size="sm" className="gap-2 hover:bg-blue-50 transition-colors">
                      <ShoppingBag className="w-4 h-4" />
                      <span className="hidden sm:inline">My Reservations ({getReservationCount()})</span>
                      <span className="sm:hidden">({getReservationCount()})</span>
                    </Button>
                  </Link>
                </>
              )}
              <AuthHeader />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <Card>
            <CardContent className="p-6">
              <div className="aspect-square w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                <ImageWithFallback
                  src={product.image}
                  alt={product.name}
                  width={600}
                  height={600}
                  className="w-full h-full object-cover"
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl">{product.name}</CardTitle>
                    <CardDescription className="text-lg mt-2">
                      {product.description}
                    </CardDescription>
                  </div>
                  <Badge variant={isOutOfStock ? "destructive" : "default"} className="text-sm">
                    {isOutOfStock ? "Out of Stock" : "Available"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-4xl font-bold text-green-600">
                    ${product.price}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Available at:</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <h5 className="font-medium text-lg">{shop.name}</h5>
                      
                      {/* Address Display with Copy Button */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between group">
                          <div className="flex items-start space-x-2 flex-1">
                            <MapPin className="w-4 h-4 mt-0.5 text-gray-500" />
                            <div className="flex-1">
                              <p className="text-gray-700 text-sm font-medium">{shop.location}</p>
                              <p className="text-gray-500 text-xs mt-1">
                                Plus Code: {generatePlusCode(shop.location)}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={handleCopyAddress}
                            >
                              {addressCopied ? (
                                <Check className="w-3 h-3 text-green-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        {/* Plus Code with Copy Button */}
                        <div className="flex items-center justify-between group ml-6">
                          <button 
                            onClick={handleCopyPlusCode}
                            className="text-blue-600 hover:text-blue-800 text-xs flex items-center space-x-1"
                          >
                            <span>Copy Plus Code</span>
                            {plusCodeCopied ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center text-gray-600">
                        <Clock className="w-4 h-4 mr-1" />
                        <span className="text-sm">{shop.hours}</span>
                      </div>
                      <Badge variant="outline" className="w-fit">
                        {shop.category}
                      </Badge>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGetDirections}
                        className="flex flex-col items-center space-y-1 h-auto py-3"
                      >
                        <Navigation className="w-4 h-4" />
                        <span className="text-xs">Directions</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleToggleWishlist}
                        className={`flex flex-col items-center space-y-1 h-auto py-3 ${
                          isWishlisted ? 'text-red-600 border-red-200 bg-red-50' : ''
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                        <span className="text-xs">{isWishlisted ? 'Saved' : 'Wishlist'}</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShareProduct}
                        className="flex flex-col items-center space-y-1 h-auto py-3"
                      >
                        <Share className="w-4 h-4" />
                        <span className="text-xs">Share</span>
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4">
                    {isOutOfStock ? (
                      <Button disabled className="w-full">
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Out of Stock
                      </Button>
                    ) : !isAuthenticated ? (
                      <div className="space-y-3">
                        <Alert>
                          <LogIn className="h-4 w-4" />
                          <AlertDescription>
                            Please log in to reserve this product for pickup.
                          </AlertDescription>
                        </Alert>
                        <Link to="/login">
                          <Button className="w-full" size="lg">
                            <LogIn className="w-4 h-4 mr-2" />
                            Sign In to Reserve
                          </Button>
                        </Link>
                        
                        {/* Chat available for guest users too */}
                        <Button
                          variant="outline"
                          className="w-full"
                          size="lg"
                          onClick={handleChatWithMerchant}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Chat with Merchant
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Dialog open={isReserveDialogOpen} onOpenChange={setIsReserveDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="w-full" size="lg">
                              <ShoppingBag className="w-4 h-4 mr-2" />
                              Reserve for Pickup
                            </Button>
                          </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reserve {product.name}</DialogTitle>
                            <DialogDescription>
                              Please provide your details to reserve this item for pickup at {shop.name}.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleReservation}>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="customer-name">Full Name *</Label>
                                <Input
                                  id="customer-name"
                                  value={customerName}
                                  onChange={(e) => setCustomerName(e.target.value)}
                                  placeholder="Enter your full name"
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="customer-email">Email (optional)</Label>
                                <Input
                                  id="customer-email"
                                  type="email"
                                  value={customerEmail}
                                  onChange={(e) => setCustomerEmail(e.target.value)}
                                  placeholder="Enter your email address"
                                />
                              </div>
                              <div className="bg-blue-50 p-4 rounded-lg">
                                <h6 className="font-medium text-sm">Pickup Details:</h6>
                                <p className="text-sm text-gray-600 mt-1">
                                  Visit {shop.name} at {shop.location} during {shop.hours} to collect your reserved item.
                                </p>
                              </div>
                            </div>
                            <DialogFooter className="mt-6">
                              <Button type="submit" disabled={!customerName.trim()}>
                                Confirm Reservation
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                        
                        {/* Chat with Merchant Button */}
                        <Button
                          variant="outline"
                          className="w-full"
                          size="lg"
                          onClick={handleChatWithMerchant}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Chat with Merchant
                        </Button>
                      </div>
                    )}
                  </div>

                  {isOutOfStock && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800 text-sm">
                        This product is currently out of stock. Please check back later or contact the shop directly.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Embedded Map Section */}
      <div className="bg-white border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900">Location & Directions</h3>
              <p className="text-gray-600 mt-1">Find {shop.name} on the map</p>
            </div>
            
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <GoogleMap
                  address={shop.location}
                  shopName={shop.name}
                  height="500px"
                  className="rounded-lg"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Customer-Merchant Chat Modal */}
      {shop && (
        <CustomerMerchantChat
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          product={product || undefined}
          shop={shop}
          customerId={user?.id}
          customerName={user?.name}
        />
      )}
    </div>
  );
};

export default ProductDetail;
