import type { Express } from "express";
import { registerShopRoutes } from "./shops";
import { registerProductRoutes } from "./products";
import { registerOrderRoutes } from "./orders";
import { registerMessageRoutes } from "./messages";
import { registerLocationRoutes } from "./location";
import customersRoutes from "./customers";
import { cleanupDatabase } from "../scripts/database-cleanup";
import { deduplicateShops } from "../scripts/deduplicate-shops";
import { auditSchema } from "../scripts/schema-audit";
import { authenticate, requireAdmin } from "../middleware/auth";

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
  
  // Register customer routes
  app.use('/api/customers', customersRoutes);
  app.use('/api', customersRoutes);
  
  // Google Drive image proxy route with caching
  app.get('/api/proxy-image', async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }
      
      // Allow common image hosting services for security
      const allowedDomains = [
        'drive.google.com',
        'images.unsplash.com',
        'imgur.com',
        'cloudinary.com',
        'amazonaws.com',
        'googleusercontent.com'
      ];
      
      const isAllowedUrl = allowedDomains.some(domain => url.includes(domain));
      if (!isAllowedUrl) {
        return res.status(400).json({ error: 'URL domain not allowed' });
      }
      
      // Check cache first
      const cached = imageCache.get(url);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        res.set({
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        });
        return res.send(cached.data);
      }
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(url);
      
      if (!response.ok) {
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
      
      
      // Send the buffered image data
      res.send(buffer);
      
    } catch (error) {
      console.error('❌ Image proxy error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Database cleanup endpoint (admin only)
  app.post('/api/admin/cleanup-database', authenticate, requireAdmin, async (req, res) => {
    try {
      await cleanupDatabase();
      res.json({ 
        success: true, 
        message: 'Database cleanup completed successfully' 
      });
    } catch (error) {
      console.error('Database cleanup failed:', error);
      res.status(500).json({ 
        error: 'Database cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Shop deduplication endpoint (admin only)
  app.post('/api/admin/deduplicate-shops', authenticate, requireAdmin, async (req, res) => {
    try {
      await deduplicateShops();
      res.json({ 
        success: true, 
        message: 'Shop deduplication completed successfully' 
      });
    } catch (error) {
      console.error('Shop deduplication failed:', error);
      res.status(500).json({ 
        error: 'Shop deduplication failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Schema audit endpoint (admin only)
  app.get('/api/admin/schema-audit', authenticate, requireAdmin, async (req, res) => {
    try {
      await auditSchema();
      res.json({ 
        success: true, 
        message: 'Schema audit completed successfully - check server logs for details' 
      });
    } catch (error) {
      console.error('Schema audit failed:', error);
      res.status(500).json({ 
        error: 'Schema audit failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}