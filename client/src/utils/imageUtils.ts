// Utility functions for image handling and Google Drive URL conversion

/**
 * Converts Google Drive sharing URLs to direct image URLs
 * Handles various Google Drive URL formats and converts them to viewable image URLs
 */
export const convertGoogleDriveUrl = (url: string): string => {
  console.log('🔄 convertGoogleDriveUrl input:', url);
  
  if (!url || !url.includes('drive.google.com')) {
    console.log('❌ Not a Google Drive URL, returning as-is');
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
    const convertedUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    console.log('✅ Converted Google Drive URL to:', convertedUrl);
    return convertedUrl;
  }
  
  console.log('❌ No file ID found in Google Drive URL');
  return url; // Fallback to original URL if no file ID found
};

/**
 * Gets the best image URL with Google Drive conversion and fallback
 */
export const getImageWithFallback = (imageUrl: string, fallbackUrl?: string): string => {
  if (!imageUrl || imageUrl.trim() === '') {
    return fallbackUrl || getDefaultPlaceholder();
  }
  
  // If it's a placeholder image, use default placeholder instead
  if (isPlaceholderImage(imageUrl)) {
    return fallbackUrl || getDefaultPlaceholder();
  }
  
  // Convert Google Drive URLs to proxied URLs to bypass CORS
  const processedUrl = convertGoogleDriveUrl(imageUrl.trim());
  
  // If it's a Google Drive URL, use our proxy
  if (processedUrl.includes('drive.google.com')) {
    return `/api/proxy-image?url=${encodeURIComponent(processedUrl)}`;
  }
  
  return processedUrl;
};

/**
 * Gets the default placeholder image URL
 */
export const getDefaultPlaceholder = (): string => {
  return 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&crop=center';
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
  console.log('🖼️ getOptimizedImageUrl input:', imageUrl);
  
  // Don't process empty URLs
  if (!imageUrl || imageUrl.trim() === '') {
    console.log('❌ Empty URL, returning default placeholder');
    return getDefaultPlaceholder();
  }
  
  // Convert Google Drive URLs first
  const convertedUrl = convertGoogleDriveUrl(imageUrl.trim());
  console.log('🖼️ After convertGoogleDriveUrl:', convertedUrl);
  
  // For Google Drive URLs, add size parameters and then proxy
  if (convertedUrl.includes('drive.google.com/uc')) {
    let urlWithSize = convertedUrl;
    if (width && height) {
      urlWithSize = convertedUrl + `&sz=w${width}-h${height}`;
      console.log('🖼️ Google Drive URL with size:', urlWithSize);
    }
    
    // Use proxy to bypass CORS
    const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(urlWithSize)}`;
    console.log('🖼️ Proxied Google Drive URL:', proxiedUrl);
    return proxiedUrl;
  }
  
  // Handle other URL types normally
  const processedUrl = getImageWithFallback(imageUrl);
  console.log('🖼️ After getImageWithFallback:', processedUrl);
  
  // For Unsplash URLs, we can add size parameters
  if (processedUrl.includes('images.unsplash.com')) {
    try {
      const url = new URL(processedUrl);
      if (width) url.searchParams.set('w', width.toString());
      if (height) url.searchParams.set('h', height.toString());
      const finalUrl = url.toString();
      console.log('🖼️ Unsplash URL with size:', finalUrl);
      return finalUrl;
    } catch (e) {
      console.log('❌ Unsplash URL parsing failed:', e);
      return processedUrl; // Return original if URL parsing fails
    }
  }
  
  console.log('🖼️ Final URL (unchanged):', processedUrl);
  return processedUrl;
};

/**
 * Logs image loading errors for debugging
 */
export const logImageError = (imageUrl: string, context: string) => {
  console.warn(`Image failed to load in ${context}:`, {
    originalUrl: imageUrl,
    processedUrl: getImageWithFallback(imageUrl),
    isGoogleDrive: imageUrl?.includes('drive.google.com'),
    context
  });
};