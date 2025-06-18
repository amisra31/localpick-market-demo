
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, MapPin, ShoppingBag } from "lucide-react";

interface CustomerReservation {
  id: string;
  productId: string;
  shopId: string;
  customerName: string;
  email?: string;
  timestamp: string;
  productName: string;
  shopName: string;
}

const CustomerReservations = () => {
  const [reservations, setReservations] = useState<CustomerReservation[]>([]);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = () => {
    const savedReservations = JSON.parse(localStorage.getItem('localpick_customer_reservations') || '[]');
    setReservations(savedReservations);
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const reservationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - reservationTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const clearReservations = () => {
    if (confirm('Are you sure you want to clear all reservations? This action cannot be undone.')) {
      localStorage.removeItem('localpick_customer_reservations');
      setReservations([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/browse" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">My Reservations</h1>
                <p className="text-gray-600">View your reserved items</p>
              </div>
            </div>
            {reservations.length > 0 && (
              <Button variant="outline" onClick={clearReservations}>
                Clear All
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {reservations.length > 0 ? (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600">
                You have {reservations.length} reservation{reservations.length > 1 ? 's' : ''} waiting for pickup
              </p>
            </div>

            <div className="grid gap-6">
              {reservations.map((reservation) => (
                <Card key={reservation.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{reservation.productName}</CardTitle>
                        <CardDescription className="text-base mt-1">
                          Reserved by {reservation.customerName}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Reserved
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h6 className="font-medium text-sm text-gray-700 mb-2">Pickup Location</h6>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center text-gray-800 font-medium">
                              <MapPin className="w-4 h-4 mr-2" />
                              {reservation.shopName}
                            </div>
                          </div>
                        </div>
                        <div>
                          <h6 className="font-medium text-sm text-gray-700 mb-2">Reservation Time</h6>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center text-gray-800">
                              <Clock className="w-4 h-4 mr-2" />
                              {getTimeAgo(reservation.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {reservation.email && (
                        <div>
                          <h6 className="font-medium text-sm text-gray-700 mb-1">Contact Email</h6>
                          <p className="text-gray-600">{reservation.email}</p>
                        </div>
                      )}

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h6 className="font-medium text-blue-800 mb-1">Ready for Pickup</h6>
                        <p className="text-blue-700 text-sm">
                          Visit {reservation.shopName} to collect your reserved item. 
                          Please bring this confirmation and a valid ID.
                        </p>
                      </div>

                      <div className="flex space-x-3">
                        <Link to={`/product/${reservation.productId}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Product Details
                          </Button>
                        </Link>
                        <Link to="/browse" className="flex-1">
                          <Button className="w-full">
                            <ShoppingBag className="w-4 h-4 mr-2" />
                            Continue Shopping
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Reservations Yet</h3>
              <p className="text-gray-600 mb-6">
                You haven't made any reservations. Start browsing products to make your first reservation!
              </p>
              <Link to="/browse">
                <Button>
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Browse Products
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CustomerReservations;
