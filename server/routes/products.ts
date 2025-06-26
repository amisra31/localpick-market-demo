import type { Express } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db, schema } from "../db";
import { nanoid } from "nanoid";
import { authenticate, requireShopOwnership } from "../middleware/auth";

export function registerProductRoutes(app: Express) {
  // Get products for a shop (exclude archived by default) - requires authentication
  app.get('/api/shops/:shopId/products', authenticate, requireShopOwnership, async (req, res) => {
    try {
      const { shopId } = req.params;
      const { includeArchived = 'false' } = req.query;
      
      // For merchants, only show products from their own shop
      // (shop ownership is already verified by requireShopOwnership middleware)
      let query = db.select().from(schema.products).where(eq(schema.products.shop_id, shopId));
      
      if (includeArchived !== 'true') {
        query = query.where(eq(schema.products.is_archived, false));
      }
      
      const products = await query.orderBy(schema.products.created_at);
      res.json(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  // Get all products (exclude archived by default)
  app.get('/api/products', async (req, res) => {
    try {
      const { includeArchived = 'false' } = req.query;
      
      let query = db.select().from(schema.products);
      
      if (includeArchived !== 'true') {
        query = query.where(eq(schema.products.is_archived, false));
      }
      
      const products = await query.orderBy(schema.products.created_at);
      res.json(products);
    } catch (error) {
      console.error('Error fetching all products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  // Get single product by ID
  app.get('/api/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [product] = await db.select().from(schema.products).where(eq(schema.products.id, id)).limit(1);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      res.json(product);
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  });

  // Create product
  app.post('/api/products', async (req, res) => {
    try {
      const productData = {
        id: nanoid(),
        ...req.body,
        created_at: Date.now(),
        updated_at: Date.now()
      };
      
      const [newProduct] = await db.insert(schema.products).values(productData).returning();
      
      // Real-time sync: Broadcast to all connected clients
      // TODO: Add WebSocket broadcasting here
      
      res.status(201).json(newProduct);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  });

  // Update product
  app.put('/api/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = {
        ...req.body,
        updated_at: Date.now()
      };
      
      const [updatedProduct] = await db.update(schema.products)
        .set(updateData)
        .where(eq(schema.products.id, id))
        .returning();
      
      if (!updatedProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Real-time sync: Broadcast to all connected clients
      // TODO: Add WebSocket broadcasting here
      
      res.json(updatedProduct);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  });

  // Archive/Unarchive product
  app.patch('/api/products/:id/archive', async (req, res) => {
    try {
      const { id } = req.params;
      const { archived } = req.body;
      
      const updateData = {
        is_archived: archived,
        archived_at: archived ? Date.now() : null,
        updated_at: Date.now()
      };
      
      const [updatedProduct] = await db.update(schema.products)
        .set(updateData)
        .where(eq(schema.products.id, id))
        .returning();
      
      if (!updatedProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Real-time sync: Broadcast to all connected clients
      // TODO: Add WebSocket broadcasting here
      
      res.json(updatedProduct);
    } catch (error) {
      console.error('Error archiving product:', error);
      res.status(500).json({ error: 'Failed to archive product' });
    }
  });

  // Permanent delete product (only for archived products)
  app.delete('/api/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // First check if product is archived
      const [product] = await db.select().from(schema.products).where(eq(schema.products.id, id)).limit(1);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      if (!product.is_archived) {
        return res.status(400).json({ error: 'Can only delete archived products. Archive first.' });
      }
      
      const [deletedProduct] = await db.delete(schema.products)
        .where(eq(schema.products.id, id))
        .returning();
      
      // Real-time sync: Broadcast to all connected clients
      // TODO: Add WebSocket broadcasting here
      
      res.json({ success: true, id });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  // Bulk operations for products
  app.post('/api/products/bulk', async (req, res) => {
    try {
      const { products, shopId } = req.body;
      
      if (!Array.isArray(products) || !shopId) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      
      const savedProducts = [];
      
      // Use transaction for consistency
      await db.transaction(async (tx) => {
        for (const product of products) {
          const productData = {
            id: nanoid(),
            shop_id: shopId,
            name: product.name,
            price: product.price,
            description: product.description,
            stock: product.stock || 0,
            image: product.image || '/placeholder.svg',
            is_archived: false,
            created_at: Date.now(),
            updated_at: Date.now()
          };
          
          const [savedProduct] = await tx.insert(schema.products).values(productData).returning();
          savedProducts.push(savedProduct);
        }
      });
      
      // Real-time sync: Broadcast to all connected clients
      // TODO: Add WebSocket broadcasting here
      
      res.json({ 
        success: true, 
        products: savedProducts,
        count: savedProducts.length 
      });
    } catch (error) {
      console.error('Bulk product creation error:', error);
      res.status(500).json({ 
        error: 'Failed to create products',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}