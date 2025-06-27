import React, { useState, useRef, useCallback } from 'react';
import { convertLegacyImageUrl, getBestImageFormat, generateSrcSet } from '@/utils/enhancedImageUtils';

interface OptimizedImageProps {
  src?: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  size?: 'thumbnail' | 'small' | 'medium' | 'large';
  responsive?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
}

/**
 * Optimized image component with modern features:
 * - Automatic WebP/JPEG format selection
 * - Responsive image support with srcset
 * - Fallback handling for legacy URLs
 * - Loading states and error handling
 * - Performance optimizations
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  size = 'medium',
  responsive = false,
  onLoad,
  onError,
  fallbackSrc
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState<string>(() => {
    if (!src || src.trim() === '') {
      return fallbackSrc || '/api/placeholder/400/300?text=No+Image+Available';
    }
    return convertLegacyImageUrl(src);
  });
  
  const hasErrored = useRef(false);
  const imgRef = useRef<HTMLImageElement>(null);

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
      
      // Try fallback sources
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
        hasErrored.current = false; // Reset for fallback attempt
        setImageState('loading');
      } else {
        // Final fallback to placeholder
        setCurrentSrc('/api/placeholder/400/300?text=Image+Not+Available');
      }
      
      onError?.();
    }
  }, [onError, fallbackSrc, currentSrc]);

  // Generate responsive image attributes
  const getImageAttributes = () => {
    if (!responsive || !src || !src.includes('/api/images/')) {
      return {
        src: currentSrc,
        srcSet: undefined
      };
    }

    // Extract image ID from optimized URL
    const imageIdMatch = currentSrc.match(/\/api\/images\/([^?]+)/);
    if (!imageIdMatch) {
      return {
        src: currentSrc,
        srcSet: undefined
      };
    }

    const imageId = imageIdMatch[1];
    const format = getBestImageFormat();

    return {
      src: currentSrc,
      srcSet: generateSrcSet(imageId, format)
    };
  };

  const { src: imageSrc, srcSet } = getImageAttributes();

  // Show loading placeholder for empty/broken images
  if (imageState === 'loading' && (!src || src.trim() === '')) {
    return (
      <div 
        className={`bg-gray-100 flex items-center justify-center ${className}`}
        style={width && height ? { width, height } : undefined}
      >
        <div className="text-gray-400 text-sm text-center p-2">
          {alt || 'No Image Available'}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <img
        ref={imgRef}
        src={imageSrc}
        srcSet={responsive ? srcSet : undefined}
        sizes={responsive ? '(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px' : undefined}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={`${className} ${imageState === 'loading' ? 'opacity-50' : 'opacity-100'} transition-opacity duration-200`}
        style={width && height ? { width, height } : undefined}
      />
      
      {/* Loading indicator */}
      {imageState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};

/**
 * Hook for preloading images
 */
export const useImagePreloader = () => {
  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = convertLegacyImageUrl(src);
    });
  }, []);

  const preloadImages = useCallback(async (sources: string[]): Promise<void> => {
    try {
      await Promise.all(sources.map(preloadImage));
    } catch (error) {
      console.warn('Some images failed to preload:', error);
    }
  }, [preloadImage]);

  return { preloadImage, preloadImages };
};