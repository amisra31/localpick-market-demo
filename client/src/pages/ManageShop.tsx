
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockShopOwners } from "@/services/mockData";
import { ArrowLeft, Store } from "lucide-react";
import { Link } from "react-router-dom";

const ManageShop = () => {
  const [selectedOwner, setSelectedOwner] = useState<string>("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (selectedOwner) {
      localStorage.setItem('localpick_current_owner', selectedOwner);
      navigate('/shop-owner-dashboard');
    }
  };

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
                Select your account to manage your shop and products
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-3 block text-gray-700">
                Select Your Shop Account
              </label>
              <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                <SelectTrigger className="bg-white border-gray-200 h-12">
                  <SelectValue placeholder="Choose your account..." />
                </SelectTrigger>
                <SelectContent>
                  {mockShopOwners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{owner.name}</span>
                        <span className="text-xs text-gray-500">{owner.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleLogin} 
              disabled={!selectedOwner}
              className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0"
            >
              Access Dashboard
            </Button>
            
            <div className="text-xs text-gray-500 text-center mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium mb-1">Demo Mode</p>
              <p>This is a demonstration login. In production, you would use secure authentication.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManageShop;
