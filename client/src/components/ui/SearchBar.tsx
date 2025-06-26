import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from 'use-debounce';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
  initialValue?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'header' | 'compact';
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search products, shops...",
  className,
  onSearch,
  initialValue = '',
  size = 'md',
  variant = 'default'
}) => {
  const [query, setQuery] = useState(initialValue);
  const [debouncedQuery] = useDebounce(query, 300);
  const navigate = useNavigate();
  const location = useLocation();

  const isOnHomePage = location.pathname === '/';

  // Handle debounced search
  useEffect(() => {
    if (onSearch) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (query.trim()) {
      // If we have a custom onSearch handler, use it
      if (onSearch) {
        onSearch(query.trim());
      } else if (!isOnHomePage) {
        // Navigate to home page with search query
        navigate(`/?search=${encodeURIComponent(query.trim())}`);
      }
    }
  }, [query, onSearch, navigate, isOnHomePage]);

  const handleClear = useCallback(() => {
    setQuery('');
    if (onSearch) {
      onSearch('');
    }
  }, [onSearch]);

  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-base',
    lg: 'h-12 text-lg'
  };

  const variantClasses = {
    default: 'bg-background border-input',
    header: 'bg-white/90 backdrop-blur-sm border-gray-200 shadow-sm',
    compact: 'bg-muted/50 border-muted'
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative flex items-center", className)}>
      <div className="relative flex-1">
        {/* Search Icon */}
        <Search className={cn(
          "absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none",
          size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
        )} />

        {/* Input */}
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(
            "pl-10 pr-10 transition-all duration-200 focus:ring-2 focus:ring-brand-primary/20",
            sizeClasses[size],
            variantClasses[variant],
            "placeholder:text-muted-foreground/70"
          )}
          aria-label="Search"
        />

        {/* Clear Button */}
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className={cn(
              "absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted rounded-full",
              "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Clear search"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Search Button (visible on mobile) */}
      <Button
        type="submit"
        size={size === 'sm' ? 'sm' : 'default'}
        className={cn(
          "ml-2 bg-brand-gradient hover:opacity-90 text-white shadow-sm",
          "sm:hidden", // Hide on larger screens
          size === 'sm' ? 'h-8 px-3' : size === 'lg' ? 'h-12 px-6' : 'h-10 px-4'
        )}
        disabled={!query.trim()}
      >
        <Search className={cn(
          size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
        )} />
        <span className="sr-only">Search</span>
      </Button>
    </form>
  );
};