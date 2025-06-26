import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { enhancedDataService } from '@/services/enhancedDataService';
import { Shop } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Store, AlertTriangle } from 'lucide-react';

interface MerchantGuardProps {
  children: (shop: Shop) => React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * MerchantGuard component ensures that:
 * 1. Only authenticated merchants can access the content
 * 2. Merchants can only see/manage their own shop data
 * 3. Provides the merchant's shop data to child components
 */
export const MerchantGuard: React.FC<MerchantGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { user, isAuthenticated } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMerchantShop = async () => {
      if (!isAuthenticated || !user || user.role !== 'merchant') {
        setIsLoading(false);
        setError('Access denied. Merchant authentication required.');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Load shop by owner ID
        const merchantShop = await enhancedDataService.getShopByOwnerId(user.id);
        
        if (!merchantShop) {
          setError('No shop found for this merchant account. Please contact support.');
          return;
        }

        setShop(merchantShop);
      } catch (err) {
        console.error('Error loading merchant shop:', err);
        setError('Failed to load shop data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadMerchantShop();
  }, [isAuthenticated, user]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Loading your shop...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-800">Access Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full mt-4"
              variant="outline"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No shop found
  if (!shop) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Store className="h-5 w-5 text-gray-600" />
              <CardTitle>No Shop Found</CardTitle>
            </div>
            <CardDescription>
              You don't have a shop associated with your merchant account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fallback || (
              <Alert>
                <AlertDescription>
                  Please contact support to set up your shop or check if you're using the correct merchant account.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success: render children with shop data
  return <>{children(shop)}</>;
};

/**
 * Hook to get merchant's shop data with access control
 */
export const useMerchantShop = () => {
  const { user, isAuthenticated } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadShop = async () => {
      if (!isAuthenticated || !user || user.role !== 'merchant') {
        setIsLoading(false);
        return;
      }

      try {
        const merchantShop = await enhancedDataService.getShopByOwnerId(user.id);
        setShop(merchantShop);
      } catch (err) {
        setError('Failed to load shop data');
      } finally {
        setIsLoading(false);
      }
    };

    loadShop();
  }, [isAuthenticated, user]);

  return { shop, isLoading, error, isAuthorized: isAuthenticated && user?.role === 'merchant' };
};