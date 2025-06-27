import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { locationService, LocationCoordinates, LocationResult } from '@/services/locationService';

interface LocationContextType {
  userLocation: string;
  coordinates: LocationCoordinates | null;
  isDetecting: boolean;
  error: string | null;
  setLocation: (address: string, coords?: LocationCoordinates) => void;
  detectCurrentLocation: () => Promise<void>;
  clearError: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [userLocation, setUserLocation] = useState<string>('Vinamra Khand');
  const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize location on mount
  useEffect(() => {
    initializeLocation();
  }, []);

  const initializeLocation = async () => {
    try {
      // Try to get saved location first
      const savedLocation = localStorage.getItem('userLocation');
      const savedCoords = localStorage.getItem('userCoordinates');
      
      if (savedLocation && savedCoords) {
        setUserLocation(savedLocation);
        try {
          setCoordinates(JSON.parse(savedCoords));
        } catch (e) {
          console.log('Error parsing saved coordinates');
        }
      }

      // Then try to detect current location
      await detectCurrentLocation();
    } catch (error) {
      console.error('Location initialization failed:', error);
    }
  };

  const detectCurrentLocation = async (): Promise<void> => {
    setIsDetecting(true);
    setError(null);

    try {
      const result = await locationService.getCurrentLocation();
      setUserLocation(result.address);
      setCoordinates(result.coordinates);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Location detection failed';
      setError(errorMessage);
      console.error('Location detection failed:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const setLocation = (address: string, coords?: LocationCoordinates): void => {
    setUserLocation(address);
    if (coords) {
      setCoordinates(coords);
      // Cache the new location
      localStorage.setItem('userLocation', address);
      localStorage.setItem('userCoordinates', JSON.stringify(coords));
      localStorage.setItem('userLocationCacheTime', Date.now().toString());
    }
    setError(null);
  };

  const clearError = (): void => {
    setError(null);
  };

  const value: LocationContextType = {
    userLocation,
    coordinates,
    isDetecting,
    error,
    setLocation,
    detectCurrentLocation,
    clearError
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};