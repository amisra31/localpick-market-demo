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
import { mockDataService } from "@/services/mockData";
import { Product, Shop } from "@/types";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Clock, ShoppingBag, ExternalLink, LogIn } from "lucide-react";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [isReserveDialogOpen, setIsReserveDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  useEffect(() => {
    if (!id) {
      navigate('/browse');
      return;
    }

    const foundProduct = mockDataService.getProductById(id);
    if (!foundProduct) {
      navigate('/browse');
      return;
    }

    const foundShop = mockDataService.getShopById(foundProduct.shopId);
    if (!foundShop) {
      navigate('/browse');
      return;
    }

    setProduct(foundProduct);
    setShop(foundShop);
  }, [id, navigate]);

  useEffect(() => {
    // Auto-fill email and name if user is logged in
    if (user) {
      setCustomerEmail(user.email);
      setCustomerName(user.name || user.email.split('@')[0]);
    }
  }, [user]);

  const handleReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !shop || !customerName.trim()) return;

    try {
      const reservation = mockDataService.createReservation({
        productId: product.id,
        shopId: shop.id,
        customerName: customerName.trim(),
        email: customerEmail.trim() || undefined
      });

      // Store reservation in customer's local storage
      const existingReservations = JSON.parse(localStorage.getItem('localpick_customer_reservations') || '[]');
      existingReservations.push({
        ...reservation,
        productName: product.name,
        shopName: shop.name
      });
      localStorage.setItem('localpick_customer_reservations', JSON.stringify(existingReservations));

      // Update product stock in state
      setProduct(prev => prev ? { ...prev, stock: prev.stock - 1 } : null);

      toast({
        title: "Reservation successful!",
        description: `${product.name} has been reserved for pickup at ${shop.name}.`
      });

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

  if (!product || !shop) {
    return <div>Loading...</div>;
  }

  const isOutOfStock = product.stock <= 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/browse" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Product Details</h1>
              <p className="text-gray-600">View and reserve this product</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <Card>
            <CardContent className="p-6">
              <div className="aspect-square w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.log('Image failed to load:', product.image);
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&crop=center';
                    e.currentTarget.alt = 'Product placeholder';
                  }}
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
                    {isOutOfStock ? "Out of Stock" : `${product.stock} in stock`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-4xl font-bold text-green-600">
                    ${product.price}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Available at:</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-medium text-lg">{shop.name}</h5>
                      <div className="flex items-center text-gray-600 mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        <button 
                          onClick={() => openGoogleMaps(shop.location)}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {shop.location}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center text-gray-600 mt-1">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{shop.hours}</span>
                      </div>
                      <Badge variant="outline" className="mt-2">
                        {shop.category}
                      </Badge>
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
                      </div>
                    ) : (
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
    </div>
  );
};

export default ProductDetail;
