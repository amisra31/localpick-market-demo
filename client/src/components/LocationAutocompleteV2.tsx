import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Loader2, X, Search, CheckCircle } from 'lucide-react';
import { debounce } from 'lodash';

interface LocationSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (location: string) => void;
  onLocationSelect?: (location: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

export const LocationAutocompleteV2: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Enter location...",
  className = ""
}) => {
  // State management
  const [isEditing, setIsEditing] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);

  // Load Google Maps API dynamically
  const loadGoogleMaps = useCallback(async () => {
    try {
      // Check if already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log('🔄 Google Maps already loaded, initializing services...');
        initializeServices();
        return;
      }

      // For now, skip Google Maps and use Nominatim directly for better reliability
      console.log('⚡ Using OpenStreetMap Nominatim for location autocomplete');
      setGoogleMapsLoaded(false);
      setError(null);
      
      // Optional: Still try to load Google Maps in background for future use
      // const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'demo_key';
      // if (apiKey && apiKey !== 'demo_key') {
      //   // Only load if we have a real API key
      //   console.log('🗺️ Loading Google Maps API in background...');
      //   // ... Google Maps loading code
      // }
    } catch (error) {
      console.error('Error in loadGoogleMaps:', error);
      setGoogleMapsLoaded(false);
      setError(null); // Don't show error, just use fallback
    }
  }, []);

  // Initialize Google Maps services
  const initializeServices = useCallback(() => {
    try {
      if (window.google && window.google.maps) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        geocoder.current = new window.google.maps.Geocoder();
        
        // Create dummy element for PlacesService
        const dummyElement = document.createElement('div');
        placesService.current = new window.google.maps.places.PlacesService(dummyElement);
        
        setGoogleMapsLoaded(true);
        setError(null);
        console.log('🚀 Google Maps services initialized');
      }
    } catch (error) {
      console.error('Error initializing Google Maps services:', error);
      setError('Failed to initialize location services');
    }
  }, []);

  // Load Google Maps on component mount
  useEffect(() => {
    loadGoogleMaps();
    
    return () => {
      // Cleanup callback
      if (window.initGoogleMaps) {
        window.initGoogleMaps = undefined as any;
      }
    };
  }, [loadGoogleMaps]);

  // Fetch suggestions from Google Places API
  const fetchGooglePlacesSuggestions = useCallback(async (query: string): Promise<LocationSuggestion[]> => {
    return new Promise((resolve, reject) => {
      if (!autocompleteService.current) {
        reject(new Error('Autocomplete service not available'));
        return;
      }

      const request = {
        input: query,
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['place_id', 'formatted_address', 'geometry']
      };

      autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          const formattedSuggestions: LocationSuggestion[] = predictions.map(prediction => ({
            place_id: prediction.place_id,
            description: prediction.description,
            main_text: prediction.structured_formatting.main_text,
            secondary_text: prediction.structured_formatting.secondary_text || '',
            structured_formatting: prediction.structured_formatting
          }));
          resolve(formattedSuggestions);
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          reject(new Error(`Places API error: ${status}`));
        }
      });
    });
  }, []);

  // Fallback to OpenStreetMap Nominatim
  const fetchNominatimSuggestions = useCallback(async (query: string): Promise<LocationSuggestion[]> => {
    try {
      console.log('🌐 Making Nominatim API call for:', query);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ Nominatim request timeout, aborting...');
        controller.abort();
      }, 8000); // 8 second timeout
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`,
        {
          headers: {
            'User-Agent': 'LocalPick/1.0'
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🌐 Nominatim raw response:', data.length, 'results');
      
      return data.map((item: any, index: number) => {
        const address = item.address;
        let mainText = '';
        let secondaryText = '';
        
        // Build main text (street address)
        if (address.house_number && address.road) {
          mainText = `${address.house_number} ${address.road}`;
        } else if (address.road) {
          mainText = address.road;
        } else if (address.neighbourhood) {
          mainText = address.neighbourhood;
        } else {
          mainText = item.display_name.split(',')[0];
        }
        
        // Build secondary text (city, state)
        const city = address.city || address.town || address.village;
        const state = address.state;
        if (city && state) {
          secondaryText = `${city}, ${state}`;
        } else if (state) {
          secondaryText = state;
        }
        
        return {
          place_id: `nominatim_${item.place_id || index}`,
          description: `${mainText}${secondaryText ? `, ${secondaryText}` : ''}`,
          main_text: mainText,
          secondary_text: secondaryText,
          structured_formatting: {
            main_text: mainText,
            secondary_text: secondaryText
          }
        };
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('❌ Nominatim request was aborted (timeout)');
          throw new Error('Location search timed out');
        } else {
          console.error('❌ Nominatim fallback error:', error.message);
        }
      } else {
        console.error('❌ Unknown Nominatim error:', error);
      }
      throw error;
    }
  }, []);

  // Main suggestion fetching function with fallback
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setError(null);
      return;
    }

    console.log(`🔍 Fetching suggestions for: "${query}"`);
    setIsLoading(true);
    setError(null);

    try {
      let results: LocationSuggestion[] = [];

      // Always try Nominatim first for better reliability
      try {
        results = await fetchNominatimSuggestions(query);
        console.log('📍 Got suggestions from Nominatim:', results.length);
      } catch (error) {
        console.warn('Nominatim failed:', error);
        
        // Fallback to Google Maps if available
        if (googleMapsLoaded) {
          try {
            results = await fetchGooglePlacesSuggestions(query);
            console.log('🎯 Got suggestions from Google Places fallback:', results.length);
          } catch (googleError) {
            console.error('Google Places also failed:', googleError);
            throw new Error('Both location services failed');
          }
        } else {
          throw error; // Re-throw original Nominatim error
        }
      }

      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSelectedIndex(-1);
      
      if (results.length === 0) {
        console.log('⚠️ No suggestions found for query:', query);
      }
    } catch (error) {
      console.error('All location services failed:', error);
      setError('Unable to fetch location suggestions');
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, [googleMapsLoaded, fetchGooglePlacesSuggestions, fetchNominatimSuggestions]);

  // Debounced suggestion fetching
  const debouncedFetchSuggestions = useMemo(
    () => debounce(fetchSuggestions, 300),
    [fetchSuggestions]
  );

  // Trigger suggestions when value changes
  useEffect(() => {
    if (isEditing && value) {
      debouncedFetchSuggestions(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      debouncedFetchSuggestions.cancel();
    };
  }, [value, isEditing, debouncedFetchSuggestions]);

  // Get place details for selected suggestion
  const getPlaceDetails = useCallback(async (placeId: string): Promise<{ lat: number; lng: number } | null> => {
    if (!googleMapsLoaded || !placesService.current) {
      return null;
    }

    return new Promise((resolve) => {
      const request = {
        placeId: placeId,
        fields: ['geometry']
      };

      placesService.current!.getDetails(request, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          resolve({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          });
        } else {
          resolve(null);
        }
      });
    });
  }, [googleMapsLoaded]);

  // Handle suggestion selection
  const selectSuggestion = useCallback(async (suggestion: LocationSuggestion) => {
    try {
      onChange(suggestion.main_text);
      
      // Try to get coordinates
      let coordinates: { lat: number; lng: number } | undefined;
      
      if (suggestion.place_id.startsWith('ChIJ')) {
        // Google Places ID
        coordinates = await getPlaceDetails(suggestion.place_id) || undefined;
      }
      
      onLocationSelect?.(suggestion.main_text, coordinates);
      
      setIsEditing(false);
      setShowSuggestions(false);
      setSuggestions([]);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error selecting suggestion:', error);
      onChange(suggestion.main_text);
      onLocationSelect?.(suggestion.main_text);
    }
  }, [onChange, onLocationSelect, getPlaceDetails]);

  // Auto-detect current location
  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { 
            enableHighAccuracy: true, 
            timeout: 15000, 
            maximumAge: 300000 
          }
        );
      });

      const { latitude, longitude } = position.coords;
      console.log('📍 Got user coordinates:', latitude, longitude);

      // Reverse geocode to get address
      if (googleMapsLoaded && geocoder.current) {
        geocoder.current.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results, status) => {
            setIsLoading(false);
            
            if (status === 'OK' && results && results[0]) {
              const address = results[0];
              let streetAddress = '';
              
              // Extract street address from components
              for (const component of address.address_components) {
                if (component.types.includes('street_number')) {
                  streetAddress += component.long_name + ' ';
                } else if (component.types.includes('route')) {
                  streetAddress += component.long_name;
                  break;
                }
              }
              
              if (!streetAddress) {
                streetAddress = address.formatted_address.split(',')[0];
              }
              
              onChange(streetAddress.trim());
              onLocationSelect?.(streetAddress.trim(), { lat: latitude, lng: longitude });
            } else {
              onChange('Current Location');
              onLocationSelect?.('Current Location', { lat: latitude, lng: longitude });
            }
          }
        );
      } else {
        // Fallback to Nominatim
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
            } else {
              streetAddress = 'Current Location';
            }
            
            onChange(streetAddress);
            onLocationSelect?.(streetAddress, { lat: latitude, lng: longitude });
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
          onChange('Current Location');
          onLocationSelect?.('Current Location', { lat: latitude, lng: longitude });
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Geolocation error:', error);
      setError('Unable to access your location');
      setIsLoading(false);
    }
  }, [googleMapsLoaded, onChange, onLocationSelect]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
  }, [showSuggestions, selectedIndex, suggestions, selectSuggestion]);

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
        if (isEditing) {
          setIsEditing(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing]);

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
              aria-expanded={showSuggestions}
              aria-haspopup="listbox"
              aria-autocomplete="list"
            />
            
            {/* Status indicator */}
            <div className="absolute right-2 top-2 flex items-center">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
              {error && <X className="w-4 h-4 text-red-500" />}
              {googleMapsLoaded && !isLoading && !error && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setIsEditing(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="text-sm text-gray-700 hover:text-blue-600 hover:underline cursor-pointer px-3 py-2 rounded transition-colors bg-white border border-gray-200 flex-1 text-left truncate"
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
          className="p-2 h-8 w-8 hover:bg-blue-50 flex-shrink-0"
          title="Detect my location"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <X className="w-3 h-3" />
          {error}
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              onClick={() => selectSuggestion(suggestion)}
              className={`w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {suggestion.structured_formatting.main_text}
                  </div>
                  {suggestion.structured_formatting.secondary_text && (
                    <div className="text-sm text-gray-500 truncate">
                      {suggestion.structured_formatting.secondary_text}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
          
          {isLoading && (
            <div className="flex items-center justify-center py-4 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm">Searching locations...</span>
            </div>
          )}
          
          {suggestions.length === 0 && !isLoading && value.length >= 2 && (
            <div className="flex items-center justify-center py-4 text-gray-500">
              <Search className="w-4 h-4 mr-2" />
              <span className="text-sm">No locations found</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};