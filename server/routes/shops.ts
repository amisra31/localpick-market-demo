import type { Express } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { nanoid } from "nanoid";
import { getWebSocketManager } from "../websocket";
import { authenticate, requireShopOwnership, requireMerchant } from "../middleware/auth";

// Image URL processing utilities for Google Drive URLs
const convertGoogleDriveUrl = (url: string): string => {
  if (!url || !url.includes('drive.google.com')) {
    return url; // Return as-is if not a Google Drive URL
  }
  
  // Extract file ID from various Google Drive URL formats
  let fileIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!fileIdMatch) {
    fileIdMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  }
  
  if (fileIdMatch) {
    const fileId = fileIdMatch[1];
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  
  return url; // Fallback to original URL
};

const processImageUrl = (imageUrl: string): string => {
  if (!imageUrl || imageUrl.trim() === '') {
    return '/placeholder.svg';
  }
  
  const trimmedUrl = imageUrl.trim();
  
  // Convert Google Drive URLs to direct image URLs
  const processedUrl = convertGoogleDriveUrl(trimmedUrl);
  
  // Validate that it looks like a reasonable URL
  if (processedUrl.startsWith('http://') || processedUrl.startsWith('https://')) {
    return processedUrl;
  }
  
  // If it doesn't look like a URL, fall back to placeholder
  return '/placeholder.svg';
};

export function registerShopRoutes(app: Express) {
  // Get all shops
  app.get('/api/shops', async (req, res) => {
    try {
      const shops = await db.select().from(schema.shops);
      res.json(shops);
    } catch (error) {
      console.error('Error fetching shops:', error);
      res.status(500).json({ error: 'Failed to fetch shops' });
    }
  });

  // Get shop by ID
  app.get('/api/shops/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [shop] = await db.select().from(schema.shops).where(eq(schema.shops.id, id)).limit(1);
      
      if (!shop) {
        return res.status(404).json({ error: 'Shop not found' });
      }
      
      res.json(shop);
    } catch (error) {
      console.error('Error fetching shop:', error);
      res.status(500).json({ error: 'Failed to fetch shop' });
    }
  });

  // Create shop
  app.post('/api/shops', async (req, res) => {
    try {
      const shopData = {
        id: nanoid(),
        ...req.body,
        created_at: Date.now(),
        updated_at: Date.now()
      };
      
      const [newShop] = await db.insert(schema.shops).values(shopData).returning();
      
      // Real-time sync: Broadcast to all connected clients
      // TODO: Add WebSocket broadcasting here
      
      res.status(201).json(newShop);
    } catch (error) {
      console.error('Error creating shop:', error);
      res.status(500).json({ error: 'Failed to create shop' });
    }
  });

  // Update shop
  app.put('/api/shops/:id', authenticate, requireShopOwnership, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = {
        ...req.body,
        updated_at: Date.now()
      };
      
      const [updatedShop] = await db.update(schema.shops)
        .set(updateData)
        .where(eq(schema.shops.id, id))
        .returning();
      
      if (!updatedShop) {
        return res.status(404).json({ error: 'Shop not found' });
      }
      
      // Real-time sync: Broadcast to all connected clients for:
      // - Customer views (shop listings, product pages)
      // - Admin dashboard
      // TODO: Add WebSocket broadcasting here
      
      res.json(updatedShop);
    } catch (error) {
      console.error('Error updating shop:', error);
      res.status(500).json({ error: 'Failed to update shop' });
    }
  });

  // Update shop operating hours
  app.put('/api/shops/:id/hours', authenticate, requireShopOwnership, async (req, res) => {
    try {
      const { id } = req.params;
      const { hours } = req.body;
      
      // Delete existing hours and insert new ones
      await db.transaction(async (tx) => {
        // Delete existing hours
        await tx.delete(schema.operating_hours).where(eq(schema.operating_hours.shop_id, id));
        
        // Insert new hours
        if (hours && Array.isArray(hours)) {
          for (const hour of hours) {
            await tx.insert(schema.operating_hours).values({
              shop_id: id,
              day_of_week: hour.day_of_week,
              is_open: hour.is_open,
              open_time: hour.open_time,
              close_time: hour.close_time,
              created_at: Date.now(),
              updated_at: Date.now()
            });
          }
        }
        
        // Update shop's updated_at timestamp
        await tx.update(schema.shops)
          .set({ updated_at: Date.now() })
          .where(eq(schema.shops.id, id));
      });
      
      // Get updated shop with hours
      const [shop] = await db.select().from(schema.shops).where(eq(schema.shops.id, id)).limit(1);
      const operatingHours = await db.select().from(schema.operating_hours).where(eq(schema.operating_hours.shop_id, id));
      
      // Real-time sync: Broadcast to all connected clients
      // TODO: Add WebSocket broadcasting here
      
      res.json({ ...shop, operating_hours: operatingHours });
    } catch (error) {
      console.error('Error updating shop hours:', error);
      res.status(500).json({ error: 'Failed to update shop hours' });
    }
  });

  // Get shop operating hours
  app.get('/api/shops/:id/hours', authenticate, requireShopOwnership, async (req, res) => {
    try {
      const { id } = req.params;
      const operatingHours = await db.select().from(schema.operating_hours).where(eq(schema.operating_hours.shop_id, id));
      res.json(operatingHours);
    } catch (error) {
      console.error('Error fetching shop hours:', error);
      res.status(500).json({ error: 'Failed to fetch shop hours' });
    }
  });

  // Shop analytics/stats
  app.get('/api/shops/:id/stats', authenticate, requireShopOwnership, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get product count
      const productCount = await db.select({ count: schema.products.id })
        .from(schema.products)
        .where(eq(schema.products.shop_id, id));
      
      // Get order count and revenue
      const orderStats = await db.select({ 
        count: schema.orders.id,
        total: schema.orders.total_amount
      })
        .from(schema.orders)
        .where(eq(schema.orders.shop_id, id));
      
      const stats = {
        product_count: productCount.length,
        order_count: orderStats.length,
        total_revenue: orderStats.reduce((sum, order) => sum + order.total, 0)
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching shop stats:', error);
      res.status(500).json({ error: 'Failed to fetch shop stats' });
    }
  });

  // Bulk upload shops and products (Admin only)
  app.post('/api/shops/bulk-upload', async (req, res) => {
    try {
      const { shops, products } = req.body;
      
      if (!shops || !Array.isArray(shops)) {
        return res.status(400).json({ error: 'Shops array is required' });
      }
      
      if (!products || !Array.isArray(products)) {
        return res.status(400).json({ error: 'Products array is required' });
      }

      let createdShops: any[] = [];
      let createdProducts: any[] = [];
      let shopIdMap: Map<string, string> = new Map(); // Map shop identifiers to generated IDs

      // First, create all shops
      for (const shopData of shops) {
        // Skip shops without a name
        if (!shopData.shop_name?.trim()) continue;
        
        const shopId = nanoid();
        const shop = {
          id: shopId,
          name: shopData.shop_name.trim(),
          category: shopData.shop_category || 'Other',
          location: shopData.location || 'Location not specified',
          phone: shopData.phone || null,
          hours: shopData.hours || 'Hours not specified',
          business_email: shopData.business_email || null,
          website: shopData.website || null,
          social_links: null,
          about_shop: shopData.about_shop || null,
          shop_photo: null,
          status: 'approved' as const, // Auto-approve shops created by admin
          owner_id: nanoid(), // Generate a unique owner ID
          submitted_at: Date.now(),
          approved_at: Date.now(),
          rejected_at: null,
          rejection_reason: null,
          created_at: Date.now(),
          updated_at: Date.now()
        };
        
        const [createdShop] = await db.insert(schema.shops).values(shop).returning();
        createdShops.push(createdShop);
        
        // Map shop identifier to generated ID
        const shopIdentifier = shopData.shop_name.toLowerCase().replace(/\s+/g, '_');
        shopIdMap.set(shopIdentifier, shopId);
        shopIdMap.set(shopData.shop_id || shopIdentifier, shopId); // Also map provided shop_id
      }

      // Then, create all products
      for (const productData of products) {
        // Skip products without a name
        if (!productData.product_name?.trim()) continue;
        
        // Find the corresponding shop ID
        let shopId = shopIdMap.get(productData.shop_id);
        
        if (!shopId) {
          // Try to find shop by name
          const matchingShop = createdShops.find(shop => 
            shop.name.toLowerCase().replace(/\s+/g, '_') === productData.shop_id
          );
          shopId = matchingShop?.id;
        }

        if (!shopId) {
          console.warn(`No matching shop found for product: ${productData.product_name} (shop_id: ${productData.shop_id})`);
          continue; // Skip this product
        }

        // Parse price and stock with fallbacks
        const price = productData.price ? parseFloat(productData.price) : 0;
        const stockValue = productData.stock !== undefined && productData.stock !== null && productData.stock !== '' 
          ? parseInt(productData.stock) 
          : 0;

        // Process image URL with Google Drive conversion and validation
        const processedImageUrl = processImageUrl(productData.image_url || productData.image || '');
        
        console.log(`Processing image for ${productData.product_name}:`, {
          original: productData.image_url || productData.image || '',
          processed: processedImageUrl
        });

        const product = {
          id: nanoid(),
          shop_id: shopId,
          name: productData.product_name.trim(),
          image: processedImageUrl,
          price: isNaN(price) ? 0 : price,
          description: productData.description || 'No description provided',
          stock: isNaN(stockValue) ? 0 : stockValue,
          is_archived: false,
          created_at: Date.now(),
          updated_at: Date.now()
        };

        const [createdProduct] = await db.insert(schema.products).values(product).returning();
        createdProducts.push(createdProduct);
      }

      // Real-time sync: Broadcast new shops and products to all connected clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        if (createdShops.length > 0) {
          wsManager.broadcastToAll('shops:bulk-created', {
            shops: createdShops,
            count: createdShops.length
          });
        }
        
        if (createdProducts.length > 0) {
          wsManager.broadcastToAll('products:bulk-created', {
            products: createdProducts,
            count: createdProducts.length
          });
        }
      }

      res.status(201).json({
        success: true,
        created_shops: createdShops.length,
        created_products: createdProducts.length,
        shops: createdShops,
        products: createdProducts,
        image_processing_summary: createdProducts.map(p => ({
          product_name: p.name,
          image_url: p.image,
          is_google_drive: p.image.includes('drive.google.com')
        }))
      });

    } catch (error) {
      console.error('Error in bulk upload:', error);
      res.status(500).json({ error: 'Failed to upload shops and products' });
    }
  });

  // Admin route to clean up database - remove test shops and duplicates
  app.delete('/api/shops/cleanup', async (req, res) => {
    try {
      // Get all shops
      const allShops = await db.select().from(schema.shops);
      
      // Identify test shops (shops with test-related names or locations)
      const testShopIds = allShops
        .filter(shop => 
          shop.name.toLowerCase().includes('test') ||
          shop.name.toLowerCase().includes('debug') ||
          shop.name.toLowerCase().includes('final') ||
          shop.name.toLowerCase().includes('working') ||
          shop.name.toLowerCase().includes('fixed') ||
          shop.location.toLowerCase().includes('test')
        )
        .map(shop => shop.id);
      
      // Identify duplicate shops (same name and location)
      const shopMap = new Map();
      const duplicateIds = [];
      
      allShops.forEach(shop => {
        const key = `${shop.name.toLowerCase().trim()}_${shop.location.toLowerCase().trim()}`;
        if (shopMap.has(key)) {
          // Keep the most recent one, mark older ones for deletion
          const existingShop = shopMap.get(key);
          if (shop.created_at > existingShop.created_at) {
            duplicateIds.push(existingShop.id);
            shopMap.set(key, shop);
          } else {
            duplicateIds.push(shop.id);
          }
        } else {
          shopMap.set(key, shop);
        }
      });
      
      const toDelete = [...new Set([...testShopIds, ...duplicateIds])];
      
      if (toDelete.length > 0) {
        // Delete associated products first (foreign key constraint)
        await db.delete(schema.products).where(
          schema.products.shop_id.in(toDelete)
        );
        
        // Delete the shops
        await db.delete(schema.shops).where(
          schema.shops.id.in(toDelete)
        );
      }
      
      res.json({
        success: true,
        deletedShops: toDelete.length,
        testShopsRemoved: testShopIds.length,
        duplicatesRemoved: duplicateIds.length
      });
      
    } catch (error) {
      console.error('Error cleaning up database:', error);
      res.status(500).json({ error: 'Failed to clean up database' });
    }
  });

  // Delete a specific shop (admin only)
  app.delete('/api/shops/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // First, delete all products associated with this shop
      await db.delete(schema.products).where(eq(schema.products.shop_id, id));
      
      // Then delete the shop
      const result = await db.delete(schema.shops).where(eq(schema.shops.id, id));
      
      // Notify WebSocket clients of shop deletion
      const wsManager = getWebSocketManager();
      wsManager.broadcastToShop(id, {
        type: 'shop_deleted',
        data: { shopId: id }
      });
      
      res.json({ 
        success: true, 
        message: 'Shop and associated products deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting shop:', error);
      res.status(500).json({ error: 'Failed to delete shop' });
    }
  });

  // Test endpoint for image URL processing
  app.post('/api/test-image-processing', (req, res) => {
    const { image_urls } = req.body;
    
    if (!image_urls || !Array.isArray(image_urls)) {
      return res.status(400).json({ error: 'image_urls array is required' });
    }
    
    const results = image_urls.map(url => ({
      original: url,
      processed: processImageUrl(url),
      is_google_drive: url?.includes('drive.google.com') || false
    }));
    
    res.json({ results });
  });
}