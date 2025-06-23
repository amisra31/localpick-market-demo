import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GoogleMapProps {
  address: string;
  shopName: string;
  className?: string;
  height?: string;
}

// Convert address to approximate coordinates for demo purposes
// In production, you'd use Google Geocoding API
const getCoordinatesFromAddress = (address: string): { lat: number; lng: number } => {
  // Simple mapping for demo - in production use proper geocoding
  const addressLower = address.toLowerCase();
  
  // Default to San Francisco area
  let lat = 37.7749;
  let lng = -122.4194;
  
  // Simple pattern matching for common cities
  if (addressLower.includes('san francisco') || addressLower.includes('sf')) {
    lat = 37.7749 + (Math.random() - 0.5) * 0.1;
    lng = -122.4194 + (Math.random() - 0.5) * 0.1;
  } else if (addressLower.includes('new york') || addressLower.includes('ny')) {
    lat = 40.7128 + (Math.random() - 0.5) * 0.1;
    lng = -74.0060 + (Math.random() - 0.5) * 0.1;
  } else if (addressLower.includes('los angeles') || addressLower.includes('la')) {
    lat = 34.0522 + (Math.random() - 0.5) * 0.1;
    lng = -118.2437 + (Math.random() - 0.5) * 0.1;
  } else if (addressLower.includes('chicago')) {
    lat = 41.8781 + (Math.random() - 0.5) * 0.1;
    lng = -87.6298 + (Math.random() - 0.5) * 0.1;
  } else if (addressLower.includes('miami')) {
    lat = 25.7617 + (Math.random() - 0.5) * 0.1;
    lng = -80.1918 + (Math.random() - 0.5) * 0.1;
  } else {
    // Generate coordinates based on address hash for consistency
    const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    lat = 37.7749 + ((hash % 1000) - 500) / 10000;
    lng = -122.4194 + ((hash % 1001) - 500) / 10000;
  }
  
  return { lat, lng };
};

export const GoogleMap: React.FC<GoogleMapProps> = ({ 
  address, 
  shopName, 
  className = '', 
  height = '400px' 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const coordinates = getCoordinatesFromAddress(address);

  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        // For demo purposes, we'll use the Google Maps Embed API
        // This provides a real Google Map without requiring API keys for basic viewing
        setMapLoaded(true);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setMapError(true);
      }
    };

    loadGoogleMaps();
  }, [address]);

  const handleGetDirections = () => {
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    window.open(directionsUrl, '_blank');
  };

  const handleViewOnMaps = () => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(mapsUrl, '_blank');
  };

  // Generate Google Maps Embed URL using the public embed interface
  // This approach works without API keys for basic map display
  const encodedAddress = encodeURIComponent(address);
  const embedUrl = `https://maps.google.com/maps?width=100%25&height=600&hl=en&q=${encodedAddress}&t=&z=16&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {mapError ? (
        // Fallback for when map fails to load
        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center rounded-lg">
          <div className="text-center space-y-4">
            <MapPin className="w-16 h-16 text-blue-600 mx-auto" />
            <div>
              <h4 className="text-lg font-semibold text-gray-900">{shopName}</h4>
              <p className="text-gray-600 max-w-md mx-auto">{address}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={handleGetDirections}
                className="flex items-center space-x-2"
              >
                <Navigation className="w-4 h-4" />
                <span>Get Directions</span>
              </Button>
              <Button 
                variant="outline"
                onClick={handleViewOnMaps}
                className="flex items-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View on Google Maps</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Real Google Maps Embed
        <div className="w-full h-full rounded-lg overflow-hidden">
          <iframe
            ref={mapRef}
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Map showing location of ${shopName}`}
            onLoad={() => {
              setMapLoaded(true);
              setMapError(false);
            }}
            onError={() => {
              console.error('Failed to load Google Maps iframe');
              setMapError(true);
            }}
            className="w-full h-full border-0"
          />
          
          {/* Loading overlay */}
          {!mapLoaded && !mapError && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading map...</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};