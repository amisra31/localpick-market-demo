import React, { useState, useRef, useCallback } from 'react';
import { getOptimizedImageUrl, getDefaultPlaceholder } from '@/utils/imageUtils';

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Stable image component that prevents flickering and handles fallbacks gracefully
 * - Prevents repeated error handling cycles
 * - Shows consistent placeholder for missing/broken images
 * - Supports lazy loading and size optimization
 */
export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  onLoad,
  onError
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [finalSrc, setFinalSrc] = useState<string>(() => {
    // Determine the source URL once at initialization
    if (!src || src.trim() === '') {
      return getDefaultPlaceholder();
    }
    return getOptimizedImageUrl(src, width, height);
  });
  
  const hasErrored = useRef(false);

  const handleLoad = useCallback(() => {
    if (!hasErrored.current) {
      setImageState('loaded');
      onLoad?.();
    }
  }, [onLoad]);

  const handleError = useCallback(() => {
    if (!hasErrored.current) {
      hasErrored.current = true;
      setImageState('error');
      setFinalSrc(getDefaultPlaceholder());
      onError?.();
    }
  }, [onError]);

  // Show loading state for broken images to prevent flashing
  const showLoadingState = imageState === 'loading' && (!src || src.trim() === '');

  return (
    <div className={`relative ${className}`}>
      {showLoadingState ? (
        <div 
          className="w-full h-full bg-gray-100 flex items-center justify-center"
          style={width && height ? { width, height } : undefined}
        >
          <div className="text-gray-400 text-sm">No Image Available</div>
        </div>
      ) : (
        <img
          src={finalSrc}
          alt={alt}
          className={className}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          style={width && height ? { width, height } : undefined}
        />
      )}
    </div>
  );
};