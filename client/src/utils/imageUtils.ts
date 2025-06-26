// Utility functions for image handling and Google Drive URL conversion

/**
 * Converts Google Drive sharing URLs to direct image URLs
 * Handles various Google Drive URL formats and converts them to viewable image URLs
 */
export const convertGoogleDriveUrl = (url: string): string => {
  if (!url || !url.includes('drive.google.com')) {
    return url; // Return as-is if not a Google Drive URL
  }
  
  // Extract file ID from various Google Drive URL formats
  // Format 1: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // Format 2: https://drive.google.com/open?id=FILE_ID
  // Format 3: https://drive.google.com/uc?id=FILE_ID
  
  let fileIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!fileIdMatch) {
    fileIdMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  }
  
  if (fileIdMatch) {
    const fileId = fileIdMatch[1];
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  
  return url; // Fallback to original URL if no file ID found
};

/**
 * Gets the best image URL with processing and fallback
 */
export const getImageWithFallback = (imageUrl: string, fallbackUrl?: string): string => {
  if (!imageUrl || imageUrl.trim() === '') {
    return fallbackUrl || getDefaultPlaceholder();
  }
  
  // If it's a placeholder image, use default placeholder instead
  if (isPlaceholderImage(imageUrl)) {
    return fallbackUrl || getDefaultPlaceholder();
  }
  
  const trimmedUrl = imageUrl.trim();
  
  // Check if it's a supported external image service that might need proxying
  const needsProxy = [
    'drive.google.com',
    'imgur.com',
    'cloudinary.com'
  ].some(domain => trimmedUrl.includes(domain));
  
  if (needsProxy) {
    const processedUrl = convertGoogleDriveUrl(trimmedUrl);
    return `/api/proxy-image?url=${encodeURIComponent(processedUrl)}`;
  }
  
  return trimmedUrl;
};

/**
 * Gets the default placeholder image URL for "No Image Available"
 */
export const getDefaultPlaceholder = (): string => {
  return '/api/placeholder/400/300?text=No+Image+Available';
};

/**
 * Checks if an image URL is a placeholder that should be replaced
 */
export const isPlaceholderImage = (imageUrl: string): boolean => {
  if (!imageUrl) return true;
  
  // Only treat static placeholder files as placeholders, not API endpoints
  const placeholderPatterns = [
    '/placeholder.svg',
    'placeholder.svg'
  ];
  
  return placeholderPatterns.some(pattern => imageUrl.includes(pattern));
};

/**
 * Validates if a URL looks like it could be an image
 */
export const isImageUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check for common image extensions
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i;
  if (imageExtensions.test(url)) return true;
  
  // Check for Google Drive URLs (which we can convert)
  if (url.includes('drive.google.com')) return true;
  
  // Check for other image hosting services
  if (url.includes('images.unsplash.com') || 
      url.includes('imgur.com') || 
      url.includes('cloudinary.com') ||
      url.includes('amazonaws.com')) return true;
  
  return false;
};

/**
 * Creates an optimized image URL with size parameters when possible
 */
export const getOptimizedImageUrl = (imageUrl: string, width?: number, height?: number): string => {
  // Don't process empty URLs
  if (!imageUrl || imageUrl.trim() === '') {
    return getDefaultPlaceholder();
  }
  
  const trimmedUrl = imageUrl.trim();
  
  // Handle Google Drive URLs with size optimization
  if (trimmedUrl.includes('drive.google.com')) {
    const convertedUrl = convertGoogleDriveUrl(trimmedUrl);
    let urlWithSize = convertedUrl;
    if (width && height && convertedUrl.includes('drive.google.com/uc')) {
      urlWithSize = convertedUrl + `&sz=w${width}-h${height}`;
    }
    return `/api/proxy-image?url=${encodeURIComponent(urlWithSize)}`;
  }
  
  // Handle Unsplash URLs with size optimization
  if (trimmedUrl.includes('images.unsplash.com')) {
    try {
      const url = new URL(trimmedUrl);
      if (width) url.searchParams.set('w', width.toString());
      if (height) url.searchParams.set('h', height.toString());
      return url.toString();
    } catch (e) {
      return trimmedUrl;
    }
  }
  
  // For other image services that might need proxying
  const needsProxy = [
    'imgur.com',
    'cloudinary.com'
  ].some(domain => trimmedUrl.includes(domain));
  
  if (needsProxy) {
    return `/api/proxy-image?url=${encodeURIComponent(trimmedUrl)}`;
  }
  
  // Return the URL as-is for local images or other allowed services
  return trimmedUrl;
};

