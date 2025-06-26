
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Store } from "lucide-react";
import { Link } from "react-router-dom";

const ManageShop = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect authenticated merchants to their dashboard
    if (isAuthenticated && user?.role === 'merchant') {
      navigate('/shop-owner-dashboard');
    } else if (!isAuthenticated) {
      // Redirect unauthenticated users to login
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Marketplace
        </Link>
        
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto">
              <Store className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Shop Management</CardTitle>
              <CardDescription className="text-base">
                Redirecting you to the appropriate dashboard...
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-gray-600">
              <p>Please wait while we redirect you to your dashboard.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManageShop;
