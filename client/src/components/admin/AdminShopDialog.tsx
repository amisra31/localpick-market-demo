import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shop } from '@/types';

interface AdminShopDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shop?: Shop | null;
  onSave: (shopData: Partial<Shop>) => Promise<void>;
}

export const AdminShopDialog: React.FC<AdminShopDialogProps> = ({
  isOpen,
  onClose,
  shop,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    location: '',
    phone: '',
    hours: '',
    businessEmail: '',
    website: '',
    aboutShop: '',
    shopPhoto: '',
    status: 'pending' as const,
    ownerId: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (shop) {
      setFormData({
        name: shop.name || '',
        category: shop.category || '',
        location: shop.location || '',
        phone: shop.phone || '',
        hours: shop.hours || '',
        businessEmail: shop.businessEmail || '',
        website: shop.website || '',
        aboutShop: shop.aboutShop || '',
        shopPhoto: shop.shopPhoto || '',
        status: shop.status || 'pending',
        ownerId: shop.ownerId || ''
      });
    } else {
      setFormData({
        name: '',
        category: '',
        location: '',
        phone: '',
        hours: '',
        businessEmail: '',
        website: '',
        aboutShop: '',
        shopPhoto: '',
        status: 'pending',
        ownerId: ''
      });
    }
  }, [shop, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving shop:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{shop ? 'Edit Shop' : 'Create New Shop'}</DialogTitle>
          <DialogDescription>
            {shop ? 'Update shop information and settings.' : 'Add a new shop to the marketplace.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Shop Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                placeholder="Enter shop name"
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Food">Food & Beverage</SelectItem>
                  <SelectItem value="Gifts">Gifts & Souvenirs</SelectItem>
                  <SelectItem value="Crafts">Arts & Crafts</SelectItem>
                  <SelectItem value="Clothing">Clothing</SelectItem>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Books">Books</SelectItem>
                  <SelectItem value="Home">Home & Garden</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              required
              placeholder="Enter shop address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            
            <div>
              <Label htmlFor="businessEmail">Business Email</Label>
              <Input
                id="businessEmail"
                type="email"
                value={formData.businessEmail}
                onChange={(e) => handleInputChange('businessEmail', e.target.value)}
                placeholder="Enter business email"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="hours">Operating Hours</Label>
            <Input
              id="hours"
              value={formData.hours}
              onChange={(e) => handleInputChange('hours', e.target.value)}
              placeholder="e.g., Mon-Fri 9AM-6PM, Sat-Sun 10AM-4PM"
            />
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <Label htmlFor="shopPhoto">Shop Photo URL</Label>
            <Input
              id="shopPhoto"
              type="url"
              value={formData.shopPhoto}
              onChange={(e) => handleInputChange('shopPhoto', e.target.value)}
              placeholder="https://example.com/photo.jpg"
            />
          </div>

          <div>
            <Label htmlFor="aboutShop">About Shop</Label>
            <Textarea
              id="aboutShop"
              value={formData.aboutShop}
              onChange={(e) => handleInputChange('aboutShop', e.target.value)}
              placeholder="Describe the shop and what makes it special..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="ownerId">Owner ID</Label>
              <Input
                id="ownerId"
                value={formData.ownerId}
                onChange={(e) => handleInputChange('ownerId', e.target.value)}
                placeholder="Enter owner user ID"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (shop ? 'Update Shop' : 'Create Shop')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};