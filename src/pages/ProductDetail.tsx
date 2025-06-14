
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { mockDataService } from "@/services/mockData";
import { Product, Shop } from "@/types";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Clock, ShoppingBag } from "lucide-react";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
              <div className="aspect-square w-full bg-gray-100 rounded-lg flex items-center justify-center">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-32 h-32 object-cover opacity-50"
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
                    ₹{product.price}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Available at:</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-medium text-lg">{shop.name}</h5>
                      <div className="flex items-center text-gray-600 mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{shop.location}</span>
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
