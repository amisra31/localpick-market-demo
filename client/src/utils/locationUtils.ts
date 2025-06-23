// Utility functions for location handling

/**
 * Converts a location string to a simplified Plus Code format
 * This is a simplified implementation - in production you'd use Google's Plus Codes API
 */
export const generatePlusCode = (location: string): string => {
  // Simple hash-based Plus Code generation for demo purposes
  const hash = location.split('').reduce((acc, char, i) => {
    return acc + char.charCodeAt(0) * (i + 1);
  }, 0);
  
  const chars = '23456789CFGHJMPQRVWX';
  let code = '';
  let tempHash = Math.abs(hash);
  
  // Generate 8 character code
  for (let i = 0; i < 8; i++) {
    code += chars[tempHash % chars.length];
    tempHash = Math.floor(tempHash / chars.length);
  }
  
  // Format as Plus Code (4+4 format with + separator)
  const formatted = `${code.slice(0, 4)}+${code.slice(4)}`;
  
  // Extract city/state from location if possible
  const parts = location.split(',');
  const cityState = parts.length > 1 ? parts.slice(-2).join(',').trim() : location;
  
  return `${formatted}, ${cityState}`;
};

/**
 * Copies text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      textArea.remove();
      return result;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Opens Google Maps directions to a location
 */
export const openDirections = (location: string) => {
  const encodedLocation = encodeURIComponent(location);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedLocation}`;
  window.open(directionsUrl, '_blank');
};

/**
 * Shares content using Web Share API or fallback
 */
export const shareProduct = async (product: { name: string; price: number }, shop: { name: string; location: string }) => {
  const shareData = {
    title: `${product.name} at ${shop.name}`,
    text: `Check out this ${product.name} for $${product.price} at ${shop.name}`,
    url: window.location.href
  };

  try {
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return true;
    } else {
      // Fallback: copy URL to clipboard
      const success = await copyToClipboard(window.location.href);
      return success;
    }
  } catch (error) {
    console.error('Error sharing:', error);
    // Fallback: copy URL to clipboard
    return await copyToClipboard(window.location.href);
  }
};

/**
 * Generates Google Maps embed URL
 */
export const generateMapEmbedUrl = (location: string, shopName: string): string => {
  const encodedLocation = encodeURIComponent(location);
  const encodedShopName = encodeURIComponent(shopName);
  
  // Using Google Maps Embed API format
  return `https://www.google.com/maps/embed/v1/place?key=PLACEHOLDER_API_KEY&q=${encodedLocation}&zoom=17&maptype=roadmap&region=US&language=en`;
};