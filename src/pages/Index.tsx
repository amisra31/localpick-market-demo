
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store, User, Shield } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🛍️ LocalPick Market
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your neighborhood marketplace for local pickup
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Connect with local shops, browse products, and reserve items for easy pickup. 
            Supporting local businesses, one reservation at a time.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Customer Portal */}
          <div className="bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Browse & Reserve</h3>
            <p className="text-gray-600 mb-6">
              Discover local products and reserve them for pickup
            </p>
            <Link to="/browse">
              <Button className="w-full">
                Start Shopping
              </Button>
            </Link>
          </div>

          {/* Shop Owner Portal */}
          <div className="bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Manage Your Shop</h3>
            <p className="text-gray-600 mb-6">
              List products and manage your local business
            </p>
            <Link to="/shop-owner-login">
              <Button variant="outline" className="w-full">
                Shop Owner Login
              </Button>
            </Link>
          </div>

          {/* Admin Portal */}
          <div className="bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Admin Dashboard</h3>
            <p className="text-gray-600 mb-6">
              Monitor shops, products, and reservations
            </p>
            <Link to="/admin">
              <Button variant="outline" className="w-full">
                Admin Access
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-2">How it works</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <div className="font-medium">1. Browse</div>
                <div>Explore local shops and products</div>
              </div>
              <div>
                <div className="font-medium">2. Reserve</div>
                <div>Reserve items you want to pick up</div>
              </div>
              <div>
                <div className="font-medium">3. Pickup</div>
                <div>Visit the shop to collect your items</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
