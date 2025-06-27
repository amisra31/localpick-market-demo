interface LocationCoordinates {
  lat: number;
  lng: number;
}

interface LocationResult {
  address: string;
  coordinates: LocationCoordinates;
  full_address?: string;
}

interface LocationSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  coordinates?: LocationCoordinates;
}

class LocationService {
  private static readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private static readonly DEFAULT_COORDS = { lat: 37.4845, lng: -119.9661 }; // Mariposa, CA
  
  /**
   * Get current user location using Geolocation API with caching
   */
  async getCurrentLocation(): Promise<LocationResult> {
    // Check cache first
    const cached = this.getCachedLocation();
    if (cached) {
      return cached;
    }

    // Try to get current position
    try {
      const position = await this.getCurrentPosition();
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      // Reverse geocode to get address
      const address = await this.reverseGeocode(coords);
      const result: LocationResult = {
        address,
        coordinates: coords
      };

      // Cache the result
      this.cacheLocation(result);
      return result;
    } catch (error) {
      console.log('❌ Geolocation failed, using default location:', error);
      
      // Fall back to default location with reverse geocoding
      try {
        const address = await this.reverseGeocode(LocationService.DEFAULT_COORDS);
        return {
          address,
          coordinates: LocationService.DEFAULT_COORDS
        };
      } catch (geocodeError) {
        console.log('❌ Reverse geocoding failed, using fallback');
        return {
          address: 'Vinamra Khand',
          coordinates: LocationService.DEFAULT_COORDS
        };
      }
    }
  }

  /**
   * Search for location suggestions
   */
  async searchLocations(query: string): Promise<LocationSuggestion[]> {
    if (query.length < 2) {
      return [];
    }

    try {
      const response = await fetch(`/api/location/search?q=${encodeURIComponent(query.trim())}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `API error: ${response.status}` };
        }
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const suggestions = await response.json();
      
      // Validate and filter suggestions
      return suggestions.filter((s: any) => 
        s && s.place_id && s.main_text && typeof s.main_text === 'string'
      );
    } catch (error) {
      console.error('❌ Location search failed:', error);
      return [];
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(coords: LocationCoordinates): Promise<string> {
    try {
      const response = await fetch(`/api/location/reverse?lat=${coords.lat}&lng=${coords.lng}`);
      if (response.ok) {
        const result = await response.json();
        if (result && result.address) {
          return result.address;
        }
      }
    } catch (error) {
      console.error('❌ Reverse geocoding failed:', error);
    }
    return 'Current Location';
  }

  /**
   * Get cached location if valid
   */
  private getCachedLocation(): LocationResult | null {
    try {
      const cachedCoords = localStorage.getItem('userCoordinates');
      const cachedAddress = localStorage.getItem('userLocation');
      const cacheTime = localStorage.getItem('userLocationCacheTime');
      
      if (cachedCoords && cachedAddress && cacheTime) {
        const now = Date.now();
        const cached = parseInt(cacheTime);
        
        if (now - cached < LocationService.CACHE_DURATION) {
          const coordinates = JSON.parse(cachedCoords);
          return {
            address: cachedAddress,
            coordinates
          };
        }
      }
    } catch (error) {
      console.log('Error reading cached location:', error);
    }
    return null;
  }

  /**
   * Cache location data
   */
  private cacheLocation(location: LocationResult): void {
    try {
      localStorage.setItem('userLocation', location.address);
      localStorage.setItem('userCoordinates', JSON.stringify(location.coordinates));
      localStorage.setItem('userLocationCacheTime', Date.now().toString());
    } catch (error) {
      console.log('Error caching location:', error);
    }
  }

  /**
   * Get current position as Promise
   */
  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 600000 // 10 minutes
        }
      );
    });
  }

  /**
   * Clear cached location data
   */
  clearCache(): void {
    localStorage.removeItem('userLocation');
    localStorage.removeItem('userCoordinates');
    localStorage.removeItem('userLocationCacheTime');
  }
}

export const locationService = new LocationService();
export type { LocationCoordinates, LocationResult, LocationSuggestion };