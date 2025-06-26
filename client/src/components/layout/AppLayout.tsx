import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LogoHeader } from '@/components/ui/LogoHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { LoginButton } from '@/components/ui/LoginButton';
import { Button } from '@/components/ui/button';
import { SimpleLocationAutocomplete } from '@/components/SimpleLocationAutocomplete';
import { Menu, X, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onLocationChange?: (location: string, coordinates?: { lat: number; lng: number }) => void;
  userLocation?: string;
  className?: string;
  headerActions?: React.ReactNode;
  variant?: 'default' | 'admin' | 'merchant' | 'customer';
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  showSearch = true,
  searchPlaceholder,
  onSearch,
  onLocationChange,
  userLocation,
  className,
  headerActions,
  variant = 'default'
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Handle mobile menu toggle
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isAdminVariant = variant === 'admin';
  const isMerchantVariant = variant === 'merchant';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Header */}
      <header className={cn(
        "app-header bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-border",
        isAdminVariant && "bg-gray-50/95",
        isMerchantVariant && "bg-blue-50/95"
      )}>
        <div className="app-container">
          <div className="flex items-center justify-between h-16">
            {/* Left Section: Logo */}
            <div className="flex items-center space-x-4">
              <LogoHeader variant="full" showTagline={false} />
            </div>

            {/* Center Section: Search & Location (Desktop) */}
            {showSearch && (
              <div className="hidden md:flex flex-1 max-w-4xl mx-8 items-center gap-3">
                <SearchBar
                  placeholder={searchPlaceholder}
                  onSearch={onSearch}
                  variant="header"
                  size="md"
                  className="flex-1"
                />
                {/* Location Selector for Customer pages */}
                {variant === 'customer' && onLocationChange && (
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <SimpleLocationAutocomplete
                      value={userLocation || 'Mariposa, CA'}
                      onChange={(location) => {}}
                      onLocationSelect={onLocationChange}
                      placeholder="Location..."
                      className="w-48"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Right Section: Actions & Auth */}
            <div className="flex items-center space-x-2">
              {/* Custom Header Actions */}
              {headerActions && (
                <div className="hidden sm:flex items-center space-x-2 mr-2">
                  {headerActions}
                </div>
              )}

              {/* Login/User Menu */}
              <div className="hidden sm:block">
                <LoginButton 
                  variant="header" 
                  size="md" 
                  showRole={true}
                  showAvatar={true}
                />
              </div>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                className="sm:hidden p-2"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Search Bar & Location */}
          {showSearch && (
            <div className="md:hidden pb-3 space-y-3">
              <SearchBar
                placeholder={searchPlaceholder}
                onSearch={onSearch}
                variant="header"
                size="md"
                className="w-full"
              />
              {/* Mobile Location Selector for Customer pages */}
              {variant === 'customer' && onLocationChange && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <SimpleLocationAutocomplete
                    value={userLocation || 'Mariposa, CA'}
                    onChange={(location) => {}}
                    onLocationSelect={onLocationChange}
                    placeholder="Enter location..."
                    className="flex-1"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 sm:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Mobile Menu Panel */}
            <div className="fixed top-16 right-0 left-0 bg-white border-b border-border shadow-lg z-50 sm:hidden">
              <div className="p-4 space-y-4">
                {/* Mobile Header Actions */}
                {headerActions && (
                  <div className="flex flex-col space-y-2">
                    {headerActions}
                  </div>
                )}

                {/* Mobile Login/User Menu */}
                <div className="flex justify-center">
                  <LoginButton 
                    variant="default" 
                    size="md" 
                    showRole={true}
                    showAvatar={true}
                    className="w-full max-w-xs"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 relative",
        className
      )}>
        {children}
      </main>

      {/* Global Toast Container */}
      <div id="toast-container" />
    </div>
  );
};