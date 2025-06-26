import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { Shop, OperatingHours, DayHours, ShopStatus } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Store, Settings, MapPin, Phone, Mail, Globe, Info, CheckCircle, AlertCircle, Clock as ClockIcon, Edit } from 'lucide-react';

interface ShopManagementProps {
  shop: Shop | null;
  onShopUpdate: (shop: Shop) => void;
}

export const ShopManagement: React.FC<ShopManagementProps> = ({ shop, onShopUpdate }) => {
  const { user } = useAuth();
  const [isShopDialogOpen, setIsShopDialogOpen] = useState(false);
  const [selectedShopImage, setSelectedShopImage] = useState<string | null>(null);

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
    name: shop?.name || '',
    category: (shop?.category || 'Food') as Shop['category'],
    location: shop?.location || '',
    phone: shop?.phone || '',
    hours: shop?.hours || '',
    operatingHours: shop?.operatingHours || defaultOperatingHours,
    businessEmail: shop?.businessEmail || '',
    website: shop?.website || '',
    socialLinks: shop?.socialLinks || '',
    aboutShop: shop?.aboutShop || '',
    shopPhoto: shop?.shopPhoto || ''
  });

  React.useEffect(() => {
    if (shop) {
      setShopForm({
        name: shop.name,
        category: shop.category,
        location: shop.location,
        phone: shop.phone || '',
        hours: shop.hours,
        operatingHours: shop.operatingHours || defaultOperatingHours,
        businessEmail: shop.businessEmail || '',
        website: shop.website || '',
        socialLinks: shop.socialLinks || '',
        aboutShop: shop.aboutShop || '',
        shopPhoto: shop.shopPhoto || ''
      });
      if (shop.shopPhoto) {
        setSelectedShopImage(shop.shopPhoto);
      }
    }
  }, [shop]);

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
        const updatedShop = await dataService.updateShop(shop.id, shopForm);
        onShopUpdate(updatedShop);
        toast({
          title: "Shop updated successfully",
          description: "Your shop profile has been updated."
        });
      } else {
        const newShop = await dataService.createShop({
          ...shopForm,
          ownerId: user.id
        });
        onShopUpdate(newShop);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Shop</h2>
          <p className="text-gray-600">Configure your shop settings and business information</p>
        </div>
      </div>

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
                Edit Shop
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Category</p>
                  <p className="text-base text-gray-900">{shop.category}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="text-base text-gray-900">{shop.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Operating Hours</p>
                  <p className="text-base text-gray-900">{shop.hours}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Business Email</p>
                  <p className="text-base text-gray-900">{shop.businessEmail || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Website</p>
                  <p className="text-base text-gray-900">{shop.website || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="text-base text-gray-900">{shop.location}</p>
                </div>
              </div>
            </div>
            {shop.aboutShop && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm font-medium text-gray-500 mb-2">About Shop</p>
                <p className="text-base text-gray-900">{shop.aboutShop}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
    </div>
  );
};