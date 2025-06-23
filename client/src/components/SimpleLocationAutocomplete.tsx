import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

interface LocationSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  coordinates?: { lat: number; lng: number };
}

interface SimpleLocationAutocompleteProps {
  value: string;
  onChange: (location: string) => void;
  onLocationSelect?: (location: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

export const SimpleLocationAutocomplete: React.FC<SimpleLocationAutocompleteProps> = ({
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

  // Fetch suggestions using our server-side API to avoid CORS issues
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    console.log('🔍 Fetching suggestions for:', query);
    setIsLoading(true);

    try {
      // Use our server-side proxy API
      const response = await fetch(`/api/location/search?q=${encodeURIComponent(query)}`);
      
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const suggestions = await response.json();
      console.log('📍 Server returned suggestions:', suggestions.length);

      setSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('❌ Location search failed:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isEditing && value.length >= 2) {
        fetchSuggestions(value);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [value, isEditing, fetchSuggestions]);

  const selectSuggestion = (suggestion: LocationSuggestion) => {
    onChange(suggestion.main_text);
    onLocationSelect?.(suggestion.main_text, suggestion.coordinates);
    setIsEditing(false);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
        
        {isEditing ? (
          <div className="relative flex-1">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsEditing(true)}
              onBlur={() => {
                // Delay to allow clicking suggestions
                setTimeout(() => {
                  setIsEditing(false);
                  setShowSuggestions(false);
                }, 200);
              }}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              placeholder={placeholder}
              autoComplete="off"
            />
            
            {isLoading && (
              <div className="absolute right-2 top-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-gray-700 hover:text-blue-600 hover:underline cursor-pointer px-3 py-2 rounded transition-colors bg-white border border-gray-200 flex-1 text-left truncate"
          >
            {value || placeholder}
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              onClick={() => selectSuggestion(suggestion)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors"
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
            <div className="flex items-center justify-center py-4 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm">Searching locations...</span>
            </div>
          )}
          
          {suggestions.length === 0 && !isLoading && value.length >= 2 && (
            <div className="flex items-center justify-center py-4 text-gray-500">
              <span className="text-sm">No locations found</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};