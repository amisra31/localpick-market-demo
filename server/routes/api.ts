import type { Express } from "express";
import { registerShopRoutes } from "./shops";
import { registerProductRoutes } from "./products";
import { registerOrderRoutes } from "./orders";
import { registerMessageRoutes } from "./messages";
import { registerLocationRoutes } from "./location";

// Simple in-memory cache for images
const imageCache = new Map<string, { data: Buffer; contentType: string; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export function registerApiRoutes(app: Express) {
  // Register all modular route handlers
  registerShopRoutes(app);
  registerProductRoutes(app);
  registerOrderRoutes(app);
  registerMessageRoutes(app);
  registerLocationRoutes(app);
  
  // Google Drive image proxy route with caching
  app.get('/api/proxy-image', async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }
      
      // Only allow Google Drive URLs for security
      if (!url.includes('drive.google.com')) {
        return res.status(400).json({ error: 'Only Google Drive URLs are allowed' });
      }
      
      // Check cache first
      const cached = imageCache.get(url);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        console.log('🚀 Serving cached image:', url);
        res.set({
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        });
        return res.send(cached.data);
      }
      
      console.log('🖼️ Fetching Google Drive image:', url);
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log('❌ Google Drive fetch failed:', response.status, response.statusText);
        return res.status(response.status).json({ error: 'Failed to fetch image' });
      }
      
      // Get content type and buffer the image data
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = await response.buffer();
      
      // Cache the image
      imageCache.set(url, {
        data: buffer,
        contentType,
        timestamp: now
      });
      
      // Clean up old cache entries periodically
      if (imageCache.size > 100) { // Simple cache size limit
        const cutoff = now - CACHE_DURATION;
        for (const [key, value] of imageCache.entries()) {
          if (value.timestamp < cutoff) {
            imageCache.delete(key);
          }
        }
      }
      
      // Set appropriate headers
      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 24 hours cache
        'Access-Control-Allow-Origin': '*'
      });
      
      console.log('✅ Successfully cached and serving image, content-type:', contentType);
      
      // Send the buffered image data
      res.send(buffer);
      
    } catch (error) {
      console.error('❌ Image proxy error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}