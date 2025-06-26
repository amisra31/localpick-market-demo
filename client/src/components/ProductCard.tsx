import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, MapPin, Clock, Eye } from 'lucide-react';
import { ProductWithShop } from '@/types';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { generatePlusCode } from '@/utils/locationUtils';

interface ProductCardProps {
  product: ProductWithShop;
  variant?: 'default' | 'compact' | 'detailed';
  showShopInfo?: boolean;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  variant = 'default',
  showShopInfo = true,
  className = ''
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'max-w-sm';
      case 'detailed':
        return 'max-w-md';
      default:
        return '';
    }
  };

  return (
    <Card className={`group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white hover:-translate-y-1 h-full flex flex-col ${getVariantClasses()} ${className}`}>
      <CardHeader className="pb-3 space-y-0">
        {/* Image Container with Fixed Aspect Ratio */}
        <div className="relative aspect-square w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-4 overflow-hidden">
          <ImageWithFallback
            src={product.image}
            alt={product.name}
            width={400}
            height={400}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {/* Stock overlay */}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <Badge variant="destructive" className="text-white">
                Out of Stock
              </Badge>
            </div>
          )}
        </div>

        {/* Product Title - Fixed Height */}
        <CardTitle className="text-lg leading-tight line-clamp-2 min-h-[3.5rem] flex items-start">
          {product.name}
        </CardTitle>
        
        {/* Product Description - Fixed Height */}
        <CardDescription className="line-clamp-3 text-sm text-gray-600 min-h-[4.5rem] leading-relaxed">
          {product.description}
        </CardDescription>
      </CardHeader>

      {/* Card Content - Flex to fill remaining space */}
      <CardContent className="flex-1 flex flex-col justify-between pt-0">
        <div className="space-y-4">
          {/* Price and Stock Info */}
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-emerald-600 tracking-tight">
              ${product.price}
            </span>
            {product.stock > 0 && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                {product.stock} available
              </Badge>
            )}
          </div>
          
          {/* Shop Information */}
          {showShopInfo && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Store className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="font-medium text-gray-900 truncate">{product.shop.name}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    const encodedLocation = encodeURIComponent(product.shop.location);
                    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
                    window.open(googleMapsUrl, '_blank');
                  }}
                  className="text-gray-700 hover:text-gray-900 hover:underline text-left leading-tight text-sm"
                  title="Open in Google Maps"
                >
                  {generatePlusCode(product.shop.location)}
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-700">{product.shop.hours}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Button - Always at bottom */}
        <div className="mt-4">
          <Link to={`/product/${product.id}`} className="block w-full">
            <Button 
              className={`w-full font-medium transition-all duration-200 ${
                product.stock > 0 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-md hover:shadow-lg' 
                  : 'bg-gray-400 text-gray-700 cursor-not-allowed opacity-75'
              }`}
              disabled={product.stock === 0}
            >
              <Eye className="w-4 h-4 mr-2" />
              {product.stock > 0 ? 'View Details' : 'Out of Stock'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};