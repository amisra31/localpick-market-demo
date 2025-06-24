import type { Express } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { nanoid } from "nanoid";

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
  app.put('/api/shops/:id', async (req, res) => {
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
  app.put('/api/shops/:id/hours', async (req, res) => {
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
  app.get('/api/shops/:id/hours', async (req, res) => {
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
  app.get('/api/shops/:id/stats', async (req, res) => {
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
        const shopId = nanoid();
        const shop = {
          id: shopId,
          name: shopData.shop_name,
          category: shopData.shop_category,
          location: shopData.location,
          phone: shopData.phone || null,
          hours: shopData.hours,
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

        const product = {
          id: nanoid(),
          shop_id: shopId,
          name: productData.product_name,
          image: productData.image_url || '/placeholder.svg',
          price: parseFloat(productData.price),
          description: productData.description,
          stock: parseInt(productData.stock),
          is_archived: false,
          created_at: Date.now(),
          updated_at: Date.now()
        };

        const [createdProduct] = await db.insert(schema.products).values(product).returning();
        createdProducts.push(createdProduct);
      }

      // TODO: Add real-time sync via WebSocket broadcasting
      // Broadcast new shops and products to all connected clients

      res.status(201).json({
        success: true,
        created_shops: createdShops.length,
        created_products: createdProducts.length,
        shops: createdShops,
        products: createdProducts
      });

    } catch (error) {
      console.error('Error in bulk upload:', error);
      res.status(500).json({ error: 'Failed to upload shops and products' });
    }
  });
}