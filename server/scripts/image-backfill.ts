import { db, schema } from '../db';
import { eq, and, not, isNull } from 'drizzle-orm';
import { imageService } from '../services/imageService';
// Google Drive URL converter (copied from client utils)
function convertGoogleDriveUrl(url: string): string {
  if (!url || !url.includes('drive.google.com')) {
    return url;
  }
  
  let fileIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!fileIdMatch) {
    fileIdMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  }
  
  if (fileIdMatch) {
    const fileId = fileIdMatch[1];
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  
  return url;
}

/**
 * Backfill script to process existing images and convert them to optimized format
 * This script will:
 * 1. Find all products and shops with external image URLs
 * 2. Download and process those images
 * 3. Update the database with new optimized URLs
 * 4. Maintain fallback handling for failed conversions
 */

interface BackfillResult {
  totalImages: number;
  processed: number;
  failed: number;
  skipped: number;
  results: Array<{
    type: 'product' | 'shop';
    id: string;
    name: string;
    originalUrl: string;
    newUrl?: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
    metadata?: any;
  }>;
}

async function backfillImages(
  options: {
    dryRun?: boolean;
    force?: boolean;
    batchSize?: number;
    maxImages?: number;
  } = {}
): Promise<BackfillResult> {
  const { dryRun = false, force = false, batchSize = 10, maxImages } = options;
  
  console.log('🚀 Starting image backfill process...');
  console.log(`📊 Options: dryRun=${dryRun}, force=${force}, batchSize=${batchSize}`);
  
  const result: BackfillResult = {
    totalImages: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
    results: []
  };

  try {
    // Step 1: Get all products with external image URLs
    console.log('📦 Finding products with external images...');
    const products = await db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        image: schema.products.image
      })
      .from(schema.products)
      .where(
        and(
          not(isNull(schema.products.image)),
          not(eq(schema.products.image, '')),
          // Only process external URLs (not already optimized)
          force ? undefined : not(schema.products.image.like('/api/images/%'))
        )
      );

    console.log(`📦 Found ${products.length} products with images`);

    // Step 2: Get all shops with external image URLs
    console.log('🏪 Finding shops with external images...');
    const shops = await db
      .select({
        id: schema.shops.id,
        name: schema.shops.name,
        shop_photo: schema.shops.shop_photo
      })
      .from(schema.shops)
      .where(
        and(
          not(isNull(schema.shops.shop_photo)),
          not(eq(schema.shops.shop_photo, '')),
          // Only process external URLs (not already optimized)
          force ? undefined : not(schema.shops.shop_photo.like('/api/images/%'))
        )
      );

    console.log(`🏪 Found ${shops.length} shops with images`);

    // Combine all images to process
    const allImages: Array<{
      type: 'product' | 'shop';
      id: string;
      name: string;
      imageUrl: string;
    }> = [
      ...products.map(p => ({
        type: 'product' as const,
        id: p.id,
        name: p.name,
        imageUrl: p.image
      })),
      ...shops.map(s => ({
        type: 'shop' as const,
        id: s.id,
        name: s.name,
        imageUrl: s.shop_photo || ''
      })).filter(s => s.imageUrl)
    ];

    result.totalImages = allImages.length;
    console.log(`🎯 Total images to process: ${result.totalImages}`);

    if (result.totalImages === 0) {
      console.log('✅ No images found to process');
      return result;
    }

    // Limit processing if maxImages is specified
    const imagesToProcess = maxImages ? allImages.slice(0, maxImages) : allImages;
    console.log(`📝 Processing ${imagesToProcess.length} images...`);

    // Process images in batches
    for (let i = 0; i < imagesToProcess.length; i += batchSize) {
      const batch = imagesToProcess.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(imagesToProcess.length / batchSize)}`);

      // Process batch concurrently
      const batchPromises = batch.map(async (item) => {
        return await processImage(item, dryRun);
      });

      const batchResults = await Promise.allSettled(batchPromises);

      // Collect results
      batchResults.forEach((promiseResult, index) => {
        const item = batch[index];
        
        if (promiseResult.status === 'fulfilled') {
          const processResult = promiseResult.value;
          result.results.push(processResult);
          
          if (processResult.status === 'success') {
            result.processed++;
          } else if (processResult.status === 'failed') {
            result.failed++;
          } else {
            result.skipped++;
          }
        } else {
          // Promise rejected
          const errorResult = {
            type: item.type,
            id: item.id,
            name: item.name,
            originalUrl: item.imageUrl,
            status: 'failed' as const,
            error: promiseResult.reason?.message || 'Unknown error'
          };
          result.results.push(errorResult);
          result.failed++;
        }
      });

      // Add a small delay between batches to avoid overwhelming the system
      if (i + batchSize < imagesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Print summary
    console.log('\n📊 BACKFILL SUMMARY:');
    console.log('================');
    console.log(`Total images: ${result.totalImages}`);
    console.log(`Processed: ${result.processed}`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Skipped: ${result.skipped}`);
    console.log(`Success rate: ${((result.processed / (result.processed + result.failed)) * 100).toFixed(1)}%`);

    if (result.failed > 0) {
      console.log('\n❌ FAILED IMAGES:');
      result.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`  - ${r.type} "${r.name}": ${r.error}`);
        });
    }

    console.log('\n✅ Image backfill completed!');
    
    return result;

  } catch (error) {
    console.error('❌ Image backfill failed:', error);
    throw error;
  }
}

async function processImage(
  item: {
    type: 'product' | 'shop';
    id: string;
    name: string;
    imageUrl: string;
  },
  dryRun: boolean
): Promise<{
  type: 'product' | 'shop';
  id: string;
  name: string;
  originalUrl: string;
  newUrl?: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  metadata?: any;
}> {
  const { type, id, name, imageUrl } = item;
  
  try {
    console.log(`📥 Processing ${type} "${name}": ${imageUrl}`);

    // Skip if URL is empty or invalid
    if (!imageUrl || imageUrl.trim() === '') {
      return {
        type,
        id,
        name,
        originalUrl: imageUrl,
        status: 'skipped',
        error: 'Empty URL'
      };
    }

    // Skip if already optimized
    if (imageUrl.startsWith('/api/images/')) {
      return {
        type,
        id,
        name,
        originalUrl: imageUrl,
        status: 'skipped',
        error: 'Already optimized'
      };
    }

    // Convert Google Drive URLs
    let processUrl = imageUrl;
    if (imageUrl.includes('drive.google.com')) {
      processUrl = convertGoogleDriveUrl(imageUrl);
    }

    // Process the image
    const processedImage = await imageService.processImageFromUrl(processUrl, {
      width: type === 'product' ? 800 : 600,
      height: type === 'product' ? 600 : 400,
      quality: 85,
      format: 'webp'
    });

    const newUrl = imageService.getOptimizedImageUrl(processedImage.id);

    // Update database if not dry run
    if (!dryRun) {
      if (type === 'product') {
        await db
          .update(schema.products)
          .set({ 
            image: newUrl,
            updated_at: Date.now()
          })
          .where(eq(schema.products.id, id));
      } else {
        await db
          .update(schema.shops)
          .set({ 
            shop_photo: newUrl,
            updated_at: Date.now()
          })
          .where(eq(schema.shops.id, id));
      }
    }

    console.log(`✅ ${dryRun ? '[DRY RUN] ' : ''}Processed ${type} "${name}": ${newUrl}`);

    return {
      type,
      id,
      name,
      originalUrl: imageUrl,
      newUrl,
      status: 'success',
      metadata: processedImage.metadata
    };

  } catch (error) {
    console.error(`❌ Failed to process ${type} "${name}":`, error);
    
    return {
      type,
      id,
      name,
      originalUrl: imageUrl,
      status: 'failed',
      error: error.message || 'Unknown error'
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    batchSize: args.includes('--batch-size') ? 
      parseInt(args[args.indexOf('--batch-size') + 1]) || 10 : 10,
    maxImages: args.includes('--max-images') ? 
      parseInt(args[args.indexOf('--max-images') + 1]) || undefined : undefined
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Image Backfill Script

Usage: tsx server/scripts/image-backfill.ts [options]

Options:
  --dry-run         Run without making database changes
  --force           Process already optimized images
  --batch-size N    Process N images at a time (default: 10)
  --max-images N    Process at most N images
  --help, -h        Show this help message

Examples:
  tsx server/scripts/image-backfill.ts --dry-run
  tsx server/scripts/image-backfill.ts --batch-size 5 --max-images 20
  tsx server/scripts/image-backfill.ts --force
    `);
    process.exit(0);
  }

  try {
    await backfillImages(options);
    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run if this script is executed directly
// Note: Disabled auto-execution to prevent running during production startup
// if (import.meta.url === `file://${process.argv[1]}`) {
//   main();
// }

export { backfillImages };