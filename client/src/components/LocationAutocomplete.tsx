import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Loader2, X } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { Loader } from '@googlemaps/js-api-loader';

interface LocationSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  types: string[];
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (location: string) => void;
  onLocationSelect?: (location: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Enter location...",
  className = ""
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  
  // Debounce the search query to avoid excessive API calls
  const [debouncedQuery] = useDebounce(value, 300);

  // Initialize Google Maps API
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        const loader = new Loader({
          apiKey: 'AIzaSyBOCrLYgCYKdGOYVEjKkZXJdZfV_demo_key', // Replace with your actual API key
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        
        // Initialize services
        autocompleteService.current = new google.maps.places.AutocompleteService();
        geocoder.current = new google.maps.Geocoder();
        
        // Create a dummy div for PlacesService
        const dummyDiv = document.createElement('div');
        placesService.current = new google.maps.places.PlacesService(dummyDiv);
        
        setGoogleMapsLoaded(true);
        console.log('✅ Google Maps API loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load Google Maps API:', error);
        console.log('🔄 Falling back to alternative geocoding service');
        setGoogleMapsLoaded(false);
      }
    };

    initializeGoogleMaps();
  }, []);

  // Fetch location suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);

    try {
      if (googleMapsLoaded && autocompleteService.current) {
        // Use Google Places Autocomplete
        const request = {
          input: query,
          types: ['address', 'establishment'],
          componentRestrictions: { country: 'us' } // Restrict to US addresses
        };

        autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
          setIsLoading(false);
          
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            const formattedSuggestions: LocationSuggestion[] = predictions.map(prediction => ({
              place_id: prediction.place_id,
              description: prediction.description,
              main_text: prediction.structured_formatting.main_text,
              secondary_text: prediction.structured_formatting.secondary_text || '',
              types: prediction.types
            }));
            
            setSuggestions(formattedSuggestions);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        });
      } else {
        // Fallback to OpenStreetMap Nominatim
        await fetchNominatimSuggestions(query);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setIsLoading(false);
      // Try fallback
      await fetchNominatimSuggestions(query);
    }
  }, [googleMapsLoaded]);

  // Fallback geocoding using OpenStreetMap
  const fetchNominatimSuggestions = async (query: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const formattedSuggestions: LocationSuggestion[] = data.map((item: any, index: number) => {
          const address = item.address;
          let mainText = '';
          let secondaryText = '';
          
          if (address.house_number && address.road) {
            mainText = `${address.house_number} ${address.road}`;
          } else if (address.road) {
            mainText = address.road;
          } else {
            mainText = item.display_name.split(',')[0];
          }
          
          const city = address.city || address.town || address.village;
          const state = address.state;
          if (city && state) {
            secondaryText = `${city}, ${state}`;
          } else if (city) {
            secondaryText = city;
          }
          
          return {
            place_id: `nominatim_${index}`,
            description: item.display_name,
            main_text: mainText,
            secondary_text: secondaryText,
            types: ['street_address']
          };
        });
        
        setSuggestions(formattedSuggestions);
        setShowSuggestions(formattedSuggestions.length > 0);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Nominatim fallback error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    if (isEditing && debouncedQuery) {
      fetchSuggestions(debouncedQuery);
    }
  }, [debouncedQuery, isEditing, fetchSuggestions]);

  // Handle suggestion selection
  const selectSuggestion = async (suggestion: LocationSuggestion) => {
    try {
      if (googleMapsLoaded && geocoder.current && suggestion.place_id.startsWith('ChIJ')) {
        // Use Google Geocoder for precise coordinates
        geocoder.current.geocode({ placeId: suggestion.place_id }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            const coordinates = { lat: location.lat(), lng: location.lng() };
            
            onChange(suggestion.main_text);
            onLocationSelect?.(suggestion.main_text, coordinates);
          } else {
            onChange(suggestion.main_text);
            onLocationSelect?.(suggestion.main_text);
          }
        });
      } else {
        // Use the main text as the location
        onChange(suggestion.main_text);
        onLocationSelect?.(suggestion.main_text);
      }
    } catch (error) {
      console.error('Error selecting suggestion:', error);
      onChange(suggestion.main_text);
      onLocationSelect?.(suggestion.main_text);
    }
    
    setIsEditing(false);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Auto-detect location
  const detectLocation = async () => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      return;
    }

    setIsLoading(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      });

      const { latitude, longitude } = position.coords;

      if (googleMapsLoaded && geocoder.current) {
        // Use Google Geocoder for reverse geocoding
        geocoder.current.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results, status) => {
            setIsLoading(false);
            
            if (status === 'OK' && results && results[0]) {
              const address = results[0].formatted_address;
              const shortAddress = address.split(',')[0]; // Get street address part
              
              onChange(shortAddress);
              onLocationSelect?.(shortAddress, { lat: latitude, lng: longitude });
            } else {
              console.error('Geocoding failed:', status);
              onChange('Current Location');
              onLocationSelect?.(
'Current Location', { lat: latitude, lng: longitude });
            }
          }
        );
      } else {
        // Fallback to Nominatim reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          
          if (response.ok) {
            const data = await response.json();
            const address = data.address;
            
            let streetAddress = '';
            if (address.house_number && address.road) {
              streetAddress = `${address.house_number} ${address.road}`;
            } else if (address.road) {
              streetAddress = address.road;
            } else if (address.neighbourhood) {
              streetAddress = address.neighbourhood;
            } else {
              streetAddress = 'Current Location';
            }
            
            onChange(streetAddress);
            onLocationSelect?.(streetAddress, { lat: latitude, lng: longitude });
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          onChange('Current Location');
          onLocationSelect?.('Current Location', { lat: latitude, lng: longitude });
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Geolocation error:', error);
      setIsLoading(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setIsEditing(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
        
        {isEditing ? (
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setIsEditing(true);
                if (value.length >= 2) {
                  fetchSuggestions(value);
                }
              }}
              className="pr-8 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              placeholder={placeholder}
              autoComplete="off"
            />
            
            {/* Clear button */}
            {value && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0 hover:bg-gray-100"
                onClick={() => {
                  onChange('');
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              setIsEditing(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="text-sm text-gray-700 hover:text-blue-600 hover:underline cursor-pointer px-3 py-2 rounded transition-colors bg-white border border-gray-200 flex-1 text-left"
          >
            {value || placeholder}
          </button>
        )}

        {/* Auto-detect button */}
        <Button
          onClick={detectLocation}
          variant="ghost"
          size="sm"
          disabled={isLoading}
          className="p-2 h-8 w-8 hover:bg-blue-50"
          title="Detect my location"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              onClick={() => selectSuggestion(suggestion)}
              className={`w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {suggestion.main_text}
                  </div>
                  {suggestion.secondary_text && (
                    <div className="text-sm text-gray-500 truncate">
                      {suggestion.secondary_text}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
          
          {isLoading && (
            <div className="flex items-center justify-center py-3 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm">Searching locations...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};