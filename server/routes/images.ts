import type { Express } from "express";
import multer from 'multer';
import { imageService } from '../services/imageService';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files at once
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  }
});

export function registerImageRoutes(app: Express) {
  
  // Upload and process single image
  app.post('/api/images/upload', authenticate, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const { width, height, quality, format } = req.query;
      const options = {
        width: width ? parseInt(width as string) : undefined,
        height: height ? parseInt(height as string) : undefined,
        quality: quality ? parseInt(quality as string) : 85,
        format: (format as 'webp' | 'jpeg') || 'webp'
      };

      console.log(`📤 Processing uploaded image: ${req.file.originalname}`);
      const processedImage = await imageService.processImage(
        req.file.buffer,
        req.file.originalname,
        options
      );

      // Return the processed image info
      res.json({
        success: true,
        image: {
          id: processedImage.id,
          originalName: processedImage.originalName,
          url: imageService.getOptimizedImageUrl(processedImage.id),
          webpUrl: imageService.getOptimizedImageUrl(processedImage.id, 'webp'),
          jpegUrl: imageService.getOptimizedImageUrl(processedImage.id, 'jpeg'),
          responsive: imageService.getResponsiveImageUrls(processedImage.id),
          width: processedImage.width,
          height: processedImage.height,
          size: processedImage.size,
          metadata: processedImage.metadata
        }
      });

    } catch (error) {
      console.error('❌ Image upload failed:', error);
      res.status(500).json({ 
        error: 'Image upload failed', 
        details: error.message 
      });
    }
  });

  // Upload and process multiple images
  app.post('/api/images/upload-multiple', authenticate, upload.array('images', 5), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'No image files provided' });
      }

      const { width, height, quality, format } = req.query;
      const options = {
        width: width ? parseInt(width as string) : undefined,
        height: height ? parseInt(height as string) : undefined,
        quality: quality ? parseInt(quality as string) : 85,
        format: (format as 'webp' | 'jpeg') || 'webp'
      };

      const results = [];
      const errors = [];

      for (const file of req.files) {
        try {
          console.log(`📤 Processing uploaded image: ${file.originalname}`);
          const processedImage = await imageService.processImage(
            file.buffer,
            file.originalname,
            options
          );

          results.push({
            id: processedImage.id,
            originalName: processedImage.originalName,
            url: imageService.getOptimizedImageUrl(processedImage.id),
            webpUrl: imageService.getOptimizedImageUrl(processedImage.id, 'webp'),
            jpegUrl: imageService.getOptimizedImageUrl(processedImage.id, 'jpeg'),
            responsive: imageService.getResponsiveImageUrls(processedImage.id),
            width: processedImage.width,
            height: processedImage.height,
            size: processedImage.size,
            metadata: processedImage.metadata
          });
        } catch (error) {
          errors.push({
            filename: file.originalname,
            error: error.message
          });
        }
      }

      res.json({
        success: results.length > 0,
        processed: results.length,
        failed: errors.length,
        images: results,
        errors
      });

    } catch (error) {
      console.error('❌ Multiple image upload failed:', error);
      res.status(500).json({ 
        error: 'Multiple image upload failed', 
        details: error.message 
      });
    }
  });

  // Serve optimized images
  app.get('/api/images/:imageId', async (req, res) => {
    try {
      const { imageId } = req.params;
      const { format = 'webp', size } = req.query;

      // Validate format
      if (format !== 'webp' && format !== 'jpeg') {
        return res.status(400).json({ error: 'Invalid format. Use webp or jpeg' });
      }

      const result = await imageService.serveImage(imageId, format as 'webp' | 'jpeg');
      
      // Set headers
      Object.entries(result.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      res.setHeader('Content-Type', result.contentType);
      res.send(result.buffer);

    } catch (error) {
      console.error('❌ Image serving failed:', error);
      
      // Return a placeholder image or 404
      res.status(404).json({ 
        error: 'Image not found',
        details: error.message 
      });
    }
  });

  // Process image from URL (for backfilling)
  app.post('/api/images/process-url', authenticate, async (req, res) => {
    try {
      const { url, width, height, quality, format } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL is required' });
      }

      const options = {
        width: width || undefined,
        height: height || undefined,
        quality: quality || 85,
        format: format || 'webp'
      };

      console.log(`📥 Processing image from URL: ${url}`);
      const processedImage = await imageService.processImageFromUrl(url, options);

      res.json({
        success: true,
        image: {
          id: processedImage.id,
          originalUrl: url,
          url: imageService.getOptimizedImageUrl(processedImage.id),
          webpUrl: imageService.getOptimizedImageUrl(processedImage.id, 'webp'),
          jpegUrl: imageService.getOptimizedImageUrl(processedImage.id, 'jpeg'),
          responsive: imageService.getResponsiveImageUrls(processedImage.id),
          width: processedImage.width,
          height: processedImage.height,
          size: processedImage.size,
          metadata: processedImage.metadata
        }
      });

    } catch (error) {
      console.error('❌ URL image processing failed:', error);
      res.status(500).json({ 
        error: 'URL image processing failed', 
        details: error.message 
      });
    }
  });

  // Get storage statistics
  app.get('/api/images/stats', authenticate, async (req, res) => {
    try {
      const stats = await imageService.getStorageStats();
      res.json({
        success: true,
        stats: {
          ...stats,
          totalSizeMB: (stats.totalSize / 1024 / 1024).toFixed(2),
          averageSizeMB: (stats.averageSize / 1024 / 1024).toFixed(2)
        }
      });
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      res.status(500).json({ 
        error: 'Failed to get storage stats', 
        details: error.message 
      });
    }
  });

  // Delete image
  app.delete('/api/images/:imageId', authenticate, async (req, res) => {
    try {
      const { imageId } = req.params;
      
      // Check if image is used by any products first
      const productsUsingImage = await db
        .select({ id: schema.products.id, name: schema.products.name })
        .from(schema.products)
        .where(eq(schema.products.image, imageService.getOptimizedImageUrl(imageId)));

      if (productsUsingImage.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete image',
          reason: 'Image is being used by products',
          products: productsUsingImage
        });
      }

      await imageService.deleteImage(imageId);

      res.json({
        success: true,
        message: 'Image deleted successfully'
      });

    } catch (error) {
      console.error('❌ Image deletion failed:', error);
      res.status(500).json({ 
        error: 'Image deletion failed', 
        details: error.message 
      });
    }
  });

  // Enhanced proxy-image endpoint with processing
  app.get('/api/proxy-image-enhanced', async (req, res) => {
    try {
      const { url, width, height, quality, format } = req.query;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      // Security check for allowed domains
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

      // Check if we already have this image processed
      const imageId = imageService.generateImageId(Buffer.from(url), 'proxy-image.jpg');
      
      try {
        // Try to serve existing processed image
        const result = await imageService.serveImage(imageId, (format as 'webp' | 'jpeg') || 'webp');
        
        Object.entries(result.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        
        res.setHeader('Content-Type', result.contentType);
        return res.send(result.buffer);
        
      } catch {
        // Image not found, process it
        console.log(`📥 Processing new proxy image: ${url}`);
        
        const options = {
          width: width ? parseInt(width as string) : undefined,
          height: height ? parseInt(height as string) : undefined,
          quality: quality ? parseInt(quality as string) : 85,
          format: (format as 'webp' | 'jpeg') || 'webp'
        };

        const processedImage = await imageService.processImageFromUrl(url, options);
        const result = await imageService.serveImage(processedImage.id, options.format);
        
        Object.entries(result.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        
        res.setHeader('Content-Type', result.contentType);
        res.send(result.buffer);
      }

    } catch (error) {
      console.error('❌ Enhanced proxy image failed:', error);
      res.status(500).json({ 
        error: 'Enhanced proxy image failed', 
        details: error.message 
      });
    }
  });
}