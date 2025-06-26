import type { Express } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "../db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createOrderSchema, updateOrderSchema, idParamSchema, paginationQuerySchema } from "../../shared/schema";
import { validateBody, validateParams, validateQuery, rateLimit, sanitizeInputs } from "../middleware/validation";
import { authenticate, requireAuth, requireShopOwnership, optionalAuth } from "../middleware/auth";

export function registerOrderRoutes(app: Express) {
  // Get all orders for a shop (requires shop ownership)
  app.get('/api/shops/:shopId/orders', 
    authenticate,
    requireShopOwnership,
    async (req, res) => {
      try {
        const { shopId } = req.params;
        const { type } = req.query; // 'order', 'reservation', or 'all'
        
        let query = db.select()
          .from(schema.orders)
          .where(eq(schema.orders.shop_id, shopId))
          .orderBy(desc(schema.orders.created_at));
        
        if (type && type !== 'all') {
          query = query.where(eq(schema.orders.order_type, type as string));
        }
        
        const orders = await query;
        
        res.json(orders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
      }
    }
  );

  // Get order by ID with product and shop details
  app.get('/api/orders/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const orderWithDetails = await db.select({
        order: schema.orders,
        product: schema.products,
        shop: schema.shops
      })
        .from(schema.orders)
        .leftJoin(schema.products, eq(schema.orders.product_id, schema.products.id))
        .leftJoin(schema.shops, eq(schema.orders.shop_id, schema.shops.id))
        .where(eq(schema.orders.id, id))
        .limit(1);
      
      if (orderWithDetails.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      res.json(orderWithDetails[0]);
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  });

  // Create order/reservation
  app.post('/api/orders', async (req, res) => {
    try {
      if (!req.body.product_id) {
        return res.status(400).json({ error: 'Product ID is required' });
      }
      
      // Get product details to validate and calculate total amount
      const [product] = await db.select().from(schema.products)
        .where(eq(schema.products.id, req.body.product_id))
        .limit(1);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const quantity = req.body.quantity || 1;
      const totalAmount = req.body.total_amount || (product.price * quantity);
      
      const orderData = {
        id: nanoid(),
        ...req.body,
        shop_id: product.shop_id, // Ensure shop_id is set from product
        total_amount: totalAmount,
        quantity,
        created_at: Date.now(),
        updated_at: Date.now()
      };
      
      const [newOrder] = await db.insert(schema.orders).values(orderData).returning();
      
      // Real-time sync: Broadcast to merchant dashboard and admin
      // TODO: Add WebSocket broadcasting here
      
      res.status(201).json(newOrder);
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  // Update order status
  app.patch('/api/orders/:id/status', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !['pending', 'reserved', 'in_progress', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      // First, get the order to verify shop ownership
      const [existingOrder] = await db.select()
        .from(schema.orders)
        .where(eq(schema.orders.id, id))
        .limit(1);
      
      if (!existingOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Verify that the authenticated user owns the shop for this order
      if (req.user?.role === 'merchant') {
        if (req.user.shop_id && req.user.shop_id !== existingOrder.shop_id) {
          return res.status(403).json({ error: 'You can only update orders for your own shop' });
        }
        
        // For database users, check shop ownership
        if (!req.user.shop_id) {
          const [shop] = await db.select()
            .from(schema.shops)
            .where(eq(schema.shops.id, existingOrder.shop_id))
            .limit(1);
          
          if (!shop || shop.owner_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only update orders for your own shop' });
          }
        }
      } else if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Only merchants and admins can update order status' });
      }
      
      const [updatedOrder] = await db.update(schema.orders)
        .set({ 
          status,
          updated_at: Date.now()
        })
        .where(eq(schema.orders.id, id))
        .returning();
      
      if (!updatedOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Real-time sync: Broadcast to all relevant users
      // - Customer (if it's their order)
      // - Admin dashboard
      // TODO: Add WebSocket broadcasting here
      
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  });

  // Update full order
  app.put('/api/orders/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = {
        ...req.body,
        updated_at: Date.now()
      };
      
      const [updatedOrder] = await db.update(schema.orders)
        .set(updateData)
        .where(eq(schema.orders.id, id))
        .returning();
      
      if (!updatedOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Real-time sync: Broadcast to all relevant users
      // TODO: Add WebSocket broadcasting here
      
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({ error: 'Failed to update order' });
    }
  });

  // Convert reservation to order
  app.post('/api/orders/:id/convert-to-order', async (req, res) => {
    try {
      const { id } = req.params;
      const { delivery_address, customer_phone } = req.body;
      
      const [updatedOrder] = await db.update(schema.orders)
        .set({
          order_type: 'order',
          delivery_address: delivery_address || null,
          customer_phone: customer_phone || null,
          status: 'pending',
          updated_at: Date.now()
        })
        .where(eq(schema.orders.id, id))
        .returning();
      
      if (!updatedOrder) {
        return res.status(404).json({ error: 'Reservation not found' });
      }
      
      // Real-time sync: Broadcast to merchant and admin
      // TODO: Add WebSocket broadcasting here
      
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error converting reservation to order:', error);
      res.status(500).json({ error: 'Failed to convert reservation' });
    }
  });

  // Get customer's orders/reservations
  app.get('/api/customers/:customerId/orders', async (req, res) => {
    try {
      const { customerId } = req.params;
      const { type } = req.query;
      
      let query = db.select({
        order: schema.orders,
        product: schema.products,
        shop: schema.shops
      })
        .from(schema.orders)
        .leftJoin(schema.products, eq(schema.orders.product_id, schema.products.id))
        .leftJoin(schema.shops, eq(schema.orders.shop_id, schema.shops.id))
        .where(eq(schema.orders.customer_id, customerId))
        .orderBy(desc(schema.orders.created_at));
      
      if (type && type !== 'all') {
        query = query.where(eq(schema.orders.order_type, type as string));
      }
      
      const orders = await query;
      res.json(orders);
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      res.status(500).json({ error: 'Failed to fetch customer orders' });
    }
  });

  // Order analytics
  app.get('/api/analytics/orders', async (req, res) => {
    try {
      const { shop_id, date_range } = req.query;
      
      let query = db.select().from(schema.orders);
      
      if (shop_id) {
        query = query.where(eq(schema.orders.shop_id, shop_id as string));
      }
      
      // TODO: Add date range filtering based on date_range parameter
      
      const orders = await query;
      
      const analytics = {
        total_orders: orders.length,
        total_revenue: orders.reduce((sum, order) => sum + order.total_amount, 0),
        order_statuses: orders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        order_types: orders.reduce((acc, order) => {
          acc[order.order_type] = (acc[order.order_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
      
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching order analytics:', error);
      res.status(500).json({ error: 'Failed to fetch order analytics' });
    }
  });
}