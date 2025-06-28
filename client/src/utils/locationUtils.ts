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
  
  // Extract city and state from location, excluding country
  const parts = location.split(',').map(part => part.trim());
  
  // Filter out common country references
  const filteredParts = parts.filter(part => 
    !part.toLowerCase().includes('united states') && 
    !part.toLowerCase().includes('usa') &&
    !part.toLowerCase().includes('us') &&
    part.length > 0
  );
  
  if (filteredParts.length >= 2) {
    const city = filteredParts[filteredParts.length - 2];
    const state = filteredParts[filteredParts.length - 1];
    return `${formatted} ${city}, ${state}`;
  } else if (filteredParts.length === 1) {
    return `${formatted} ${filteredParts[0]}`;
  } else {
    return `${formatted} ${parts[0]}`;
  };
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
    // Check if Web Share API is available and we're in a secure context
    if ('share' in navigator && window.isSecureContext) {
      console.log('Using native Web Share API');
      await navigator.share(shareData);
      return true;
    } else {
      // Fallback: copy URL to clipboard with user feedback
      console.log('Web Share API not available, using clipboard fallback');
      const success = await copyToClipboard(window.location.href);
      if (success) {
        // Create temporary visual feedback for clipboard copy
        const tempDiv = document.createElement('div');
        tempDiv.textContent = 'Link copied to clipboard!';
        tempDiv.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #333;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          z-index: 10000;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(tempDiv);
        setTimeout(() => {
          if (document.body.contains(tempDiv)) {
            document.body.removeChild(tempDiv);
          }
        }, 2000);
      }
      return success;
    }
  } catch (error) {
    console.error('Error sharing:', error);
    // Fallback: copy URL to clipboard
    const success = await copyToClipboard(window.location.href);
    if (success) {
      // Show feedback for fallback too
      const tempDiv = document.createElement('div');
      tempDiv.textContent = 'Link copied to clipboard!';
      tempDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #333;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      document.body.appendChild(tempDiv);
      setTimeout(() => {
        if (document.body.contains(tempDiv)) {
          document.body.removeChild(tempDiv);
        }
      }, 2000);
    }
    return success;
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