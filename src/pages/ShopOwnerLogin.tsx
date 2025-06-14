
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockShopOwners } from "@/services/mockData";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const ShopOwnerLogin = () => {
  const [selectedOwner, setSelectedOwner] = useState<string>("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (selectedOwner) {
      localStorage.setItem('localpick_current_owner', selectedOwner);
      navigate('/shop-owner-dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Home
        </Link>
        
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Shop Owner Login</CardTitle>
            <CardDescription>
              Select your account to manage your shop
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Your Account
              </label>
              <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your account..." />
                </SelectTrigger>
                <SelectContent>
                  {mockShopOwners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name} ({owner.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleLogin} 
              disabled={!selectedOwner}
              className="w-full"
            >
              Login to Dashboard
            </Button>
            
            <div className="text-xs text-gray-500 text-center mt-4">
              This is a demo login. In a real app, you would use proper authentication.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShopOwnerLogin;
