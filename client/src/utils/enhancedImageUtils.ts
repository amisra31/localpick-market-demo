// Enhanced utility functions for optimized image handling

/**
 * Determines the best image URL format based on browser support
 */
export const getBestImageFormat = (): 'webp' | 'jpeg' => {
  // Check if browser supports WebP
  if (typeof window !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    // Test WebP support
    const supportsWebP = canvas.toDataURL('image/webp').indexOf('webp') > -1;
    return supportsWebP ? 'webp' : 'jpeg';
  }
  
  // Default to WebP for SSR
  return 'webp';
};

/**
 * Generates srcset for responsive images
 */
export const generateSrcSet = (imageId: string, format?: 'webp' | 'jpeg'): string => {
  const actualFormat = format || getBestImageFormat();
  
  return [
    `/api/images/${imageId}?format=${actualFormat}&size=small 400w`,
    `/api/images/${imageId}?format=${actualFormat}&size=medium 800w`,
    `/api/images/${imageId}?format=${actualFormat}&size=large 1200w`
  ].join(', ');
};

/**
 * Gets the optimized image URL with modern features
 */
export const getOptimizedImageUrl = (
  imageId: string, 
  options: {
    size?: 'thumbnail' | 'small' | 'medium' | 'large';
    format?: 'webp' | 'jpeg';
    width?: number;
    height?: number;
  } = {}
): string => {
  const { size = 'medium', format, width, height } = options;
  const actualFormat = format || getBestImageFormat();
  
  let url = `/api/images/${imageId}?format=${actualFormat}`;
  
  if (size) {
    url += `&size=${size}`;
  }
  
  if (width) {
    url += `&width=${width}`;
  }
  
  if (height) {
    url += `&height=${height}`;
  }
  
  return url;
};

/**
 * Handles legacy Google Drive URLs by converting them to optimized URLs
 */
export const convertLegacyImageUrl = (url: string): string => {
  if (!url || url.trim() === '') {
    return '/api/placeholder/400/300?text=No+Image+Available';
  }

  // If it's already an optimized URL, return as-is
  if (url.startsWith('/api/images/')) {
    return url;
  }

  // If it's a Google Drive URL, proxy it through the enhanced proxy
  if (url.includes('drive.google.com')) {
    const format = getBestImageFormat();
    return `/api/proxy-image-enhanced?url=${encodeURIComponent(url)}&format=${format}`;
  }

  // For other external URLs, use the regular proxy
  if (url.startsWith('http')) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }

  // Return as-is for local URLs
  return url;
};

/**
 * Uploads and processes an image file
 */
export const uploadImage = async (
  file: File,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg';
  } = {}
): Promise<{
  success: boolean;
  image?: {
    id: string;
    url: string;
    webpUrl: string;
    jpegUrl: string;
    responsive: any;
    width: number;
    height: number;
    size: number;
    metadata: any;
  };
  error?: string;
}> => {
  try {
    const formData = new FormData();
    formData.append('image', file);

    // Add options as query parameters
    const params = new URLSearchParams();
    if (options.width) params.set('width', options.width.toString());
    if (options.height) params.set('height', options.height.toString());
    if (options.quality) params.set('quality', options.quality.toString());
    if (options.format) params.set('format', options.format);

    const queryString = params.toString();
    const url = `/api/images/upload${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Upload failed');
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Upload failed'
    };
  }
};

/**
 * Uploads multiple images
 */
export const uploadMultipleImages = async (
  files: FileList | File[],
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg';
  } = {}
): Promise<{
  success: boolean;
  processed: number;
  failed: number;
  images: any[];
  errors: any[];
}> => {
  try {
    const formData = new FormData();
    
    // Convert FileList to Array if needed
    const fileArray = Array.from(files);
    
    fileArray.forEach(file => {
      formData.append('images', file);
    });

    // Add options as query parameters
    const params = new URLSearchParams();
    if (options.width) params.set('width', options.width.toString());
    if (options.height) params.set('height', options.height.toString());
    if (options.quality) params.set('quality', options.quality.toString());
    if (options.format) params.set('format', options.format);

    const queryString = params.toString();
    const url = `/api/images/upload-multiple${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Upload failed');
    }

    return result;
  } catch (error) {
    return {
      success: false,
      processed: 0,
      failed: fileArray?.length || 0,
      images: [],
      errors: [{ error: error.message || 'Upload failed' }]
    };
  }
};

/**
 * Process an image from a URL (for backfilling)
 */
export const processImageFromUrl = async (
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg';
  } = {}
): Promise<{
  success: boolean;
  image?: any;
  error?: string;
}> => {
  try {
    const response = await fetch('/api/images/process-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        ...options
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Processing failed');
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Processing failed'
    };
  }
};

/**
 * Image validation utility
 */
export const validateImage = (file: File): {
  valid: boolean;
  error?: string;
} => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'
    };
  }

  // Check file size (10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.'
    };
  }

  return { valid: true };
};

/**
 * Get storage statistics
 */
export const getStorageStats = async (): Promise<{
  success: boolean;
  stats?: any;
  error?: string;
}> => {
  try {
    const response = await fetch('/api/images/stats');
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get stats');
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to get stats'
    };
  }
};