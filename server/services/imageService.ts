import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface ProcessedImage {
  id: string;
  originalName: string;
  processedPath: string;
  webpPath?: string;
  jpegPath?: string;
  size: number;
  width: number;
  height: number;
  format: string;
  metadata: any;
}

export class ImageService {
  private readonly uploadDir: string;
  private readonly processedDir: string;
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'original');
    this.processedDir = path.join(process.cwd(), 'uploads', 'processed');
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.processedDir, { recursive: true });
      console.log('📁 Image directories created/verified');
    } catch (error) {
      console.error('❌ Failed to create image directories:', error);
    }
  }

  /**
   * Generate a unique image ID based on content hash
   */
  generateImageId(buffer: Buffer, originalName: string): string {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const ext = path.extname(originalName).toLowerCase();
    return `${hash.substring(0, 16)}${ext}`;
  }

  /**
   * Validate image file
   */
  private async validateImage(buffer: Buffer, originalName: string): Promise<void> {
    // Check file size
    if (buffer.length > this.maxFileSize) {
      throw new Error(`File too large. Maximum size is ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // Check file extension
    const ext = path.extname(originalName).toLowerCase().slice(1);
    if (!this.allowedFormats.includes(ext)) {
      throw new Error(`Unsupported format. Allowed: ${this.allowedFormats.join(', ')}`);
    }

    // Validate image with Sharp
    try {
      await sharp(buffer).metadata();
    } catch (error) {
      throw new Error('Invalid image file');
    }
  }

  /**
   * Process and optimize image with multiple formats
   */
  async processImage(
    buffer: Buffer, 
    originalName: string, 
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage> {
    await this.validateImage(buffer, originalName);

    const {
      width = 800,
      height = 600,
      quality = 85,
      format = 'webp',
      fit = 'cover'
    } = options;

    const imageId = this.generateImageId(buffer, originalName);
    const baseName = path.parse(imageId).name;
    
    // Define output paths
    const webpPath = path.join(this.processedDir, `${baseName}.webp`);
    const jpegPath = path.join(this.processedDir, `${baseName}.jpeg`);
    const originalPath = path.join(this.uploadDir, imageId);

    try {
      // Get original metadata
      const metadata = await sharp(buffer).metadata();

      // Save original
      await fs.writeFile(originalPath, buffer);

      // Create Sharp instance
      let pipeline = sharp(buffer);

      // Resize if dimensions specified
      if (width || height) {
        pipeline = pipeline.resize(width, height, { 
          fit,
          withoutEnlargement: true 
        });
      }

      // Generate WebP version (smaller, better compression)
      const webpBuffer = await pipeline
        .clone()
        .webp({ quality, effort: 4 })
        .toBuffer();
      await fs.writeFile(webpPath, webpBuffer);

      // Generate JPEG version (better compatibility)
      const jpegBuffer = await pipeline
        .clone()
        .jpeg({ quality, progressive: true })
        .toBuffer();
      await fs.writeFile(jpegPath, jpegBuffer);

      // Get processed image info
      const processedMetadata = await sharp(webpBuffer).metadata();

      const result: ProcessedImage = {
        id: imageId,
        originalName,
        processedPath: path.relative(process.cwd(), webpPath),
        webpPath: path.relative(process.cwd(), webpPath),
        jpegPath: path.relative(process.cwd(), jpegPath),
        size: webpBuffer.length,
        width: processedMetadata.width || width || metadata.width || 0,
        height: processedMetadata.height || height || metadata.height || 0,
        format: 'webp',
        metadata: {
          originalSize: buffer.length,
          originalWidth: metadata.width,
          originalHeight: metadata.height,
          originalFormat: metadata.format,
          compressionRatio: ((buffer.length - webpBuffer.length) / buffer.length * 100).toFixed(1)
        }
      };

      console.log(`✅ Image processed: ${originalName} -> ${result.id}`);
      console.log(`📊 Size reduction: ${result.metadata.compressionRatio}%`);

      return result;

    } catch (error) {
      // Cleanup on error
      await this.cleanup([originalPath, webpPath, jpegPath]);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Process image from URL (for backfilling existing images)
   */
  async processImageFromUrl(url: string, options: ImageProcessingOptions = {}): Promise<ProcessedImage> {
    try {
      console.log(`📥 Downloading image from: ${url}`);
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.buffer();
      const originalName = this.extractFilenameFromUrl(url);

      return await this.processImage(buffer, originalName, options);
    } catch (error) {
      throw new Error(`Failed to process image from URL: ${error.message}`);
    }
  }

  /**
   * Extract filename from URL
   */
  private extractFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = path.basename(pathname);
      
      // If no proper filename, generate one
      if (!filename || !path.extname(filename)) {
        return `image_${Date.now()}.jpg`;
      }
      
      return filename;
    } catch {
      return `image_${Date.now()}.jpg`;
    }
  }

  /**
   * Generate multiple sizes for responsive images
   */
  async generateResponsiveSizes(
    buffer: Buffer, 
    originalName: string
  ): Promise<{ [size: string]: ProcessedImage }> {
    const sizes = {
      thumbnail: { width: 150, height: 150, quality: 80 },
      small: { width: 400, height: 300, quality: 85 },
      medium: { width: 800, height: 600, quality: 85 },
      large: { width: 1200, height: 900, quality: 90 }
    };

    const results: { [size: string]: ProcessedImage } = {};

    for (const [sizeName, options] of Object.entries(sizes)) {
      try {
        results[sizeName] = await this.processImage(buffer, originalName, options);
      } catch (error) {
        console.error(`❌ Failed to generate ${sizeName} size:`, error);
      }
    }

    return results;
  }

  /**
   * Get optimized image URL
   */
  getOptimizedImageUrl(imageId: string, format: 'webp' | 'jpeg' = 'webp'): string {
    return `/api/images/${imageId}?format=${format}`;
  }

  /**
   * Get responsive image URLs
   */
  getResponsiveImageUrls(imageId: string): {
    webp: { [size: string]: string };
    jpeg: { [size: string]: string };
  } {
    const sizes = ['thumbnail', 'small', 'medium', 'large'];
    const webp: { [size: string]: string } = {};
    const jpeg: { [size: string]: string } = {};

    sizes.forEach(size => {
      webp[size] = `/api/images/${imageId}?format=webp&size=${size}`;
      jpeg[size] = `/api/images/${imageId}?format=jpeg&size=${size}`;
    });

    return { webp, jpeg };
  }

  /**
   * Serve processed image
   */
  async serveImage(imageId: string, format: 'webp' | 'jpeg' = 'webp'): Promise<{
    buffer: Buffer;
    contentType: string;
    headers: Record<string, string>;
  }> {
    const baseName = path.parse(imageId).name;
    const extension = format === 'webp' ? '.webp' : '.jpeg';
    const imagePath = path.join(this.processedDir, `${baseName}${extension}`);

    try {
      const buffer = await fs.readFile(imagePath);
      const contentType = format === 'webp' ? 'image/webp' : 'image/jpeg';
      
      return {
        buffer,
        contentType,
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache
          'ETag': `"${crypto.createHash('md5').update(buffer).digest('hex')}"`,
          'Content-Length': buffer.length.toString()
        }
      };
    } catch (error) {
      throw new Error(`Image not found: ${imageId}`);
    }
  }

  /**
   * Delete processed images
   */
  async deleteImage(imageId: string): Promise<void> {
    const baseName = path.parse(imageId).name;
    const files = [
      path.join(this.uploadDir, imageId),
      path.join(this.processedDir, `${baseName}.webp`),
      path.join(this.processedDir, `${baseName}.jpeg`)
    ];

    await this.cleanup(files);
  }

  /**
   * Cleanup files
   */
  private async cleanup(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    }
  }

  /**
   * Get storage stats
   */
  async getStorageStats(): Promise<{
    totalImages: number;
    totalSize: number;
    averageSize: number;
    formats: { [format: string]: number };
  }> {
    try {
      const processedFiles = await fs.readdir(this.processedDir);
      let totalSize = 0;
      const formats: { [format: string]: number } = {};

      for (const file of processedFiles) {
        const filePath = path.join(this.processedDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;

        const ext = path.extname(file).slice(1);
        formats[ext] = (formats[ext] || 0) + 1;
      }

      return {
        totalImages: processedFiles.length,
        totalSize,
        averageSize: processedFiles.length > 0 ? totalSize / processedFiles.length : 0,
        formats
      };
    } catch (error) {
      return { totalImages: 0, totalSize: 0, averageSize: 0, formats: {} };
    }
  }
}

// Export singleton instance
export const imageService = new ImageService();