import type { Express } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "../db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createOrderSchema, updateOrderSchema, idParamSchema, paginationQuerySchema } from "../../shared/schema";
import { validateBody, validateParams, validateQuery, rateLimit, sanitizeInputs } from "../middleware/validation";
import { authenticate, requireAuth, requireShopOwnership, optionalAuth } from "../middleware/auth";
import { OrderService } from "../services/orderService";

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
      const { status, notes } = req.body;
      
      console.log(`🔄 Order status update API called:`, {
        orderId: id,
        newStatus: status,
        notes,
        userId: req.user?.id,
        userRole: req.user?.role
      });
      
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // First, get the order to verify ownership permissions
      const [existingOrder] = await db.select()
        .from(schema.orders)
        .where(eq(schema.orders.id, id))
        .limit(1);
      
      if (!existingOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Verify permissions based on user role
      if (req.user.role === 'merchant') {
        // Check shop ownership for merchants
        if (req.user.shop_id && req.user.shop_id !== existingOrder.shop_id) {
          return res.status(403).json({ error: 'You can only update orders for your own shop' });
        }
        
        // For database users, check shop ownership via shops table
        if (!req.user.shop_id) {
          const [shop] = await db.select()
            .from(schema.shops)
            .where(eq(schema.shops.id, existingOrder.shop_id))
            .limit(1);
          
          if (!shop || shop.owner_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only update orders for your own shop' });
          }
        }
      } else if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only merchants and admins can update order status' });
      }
      
      // Use centralized OrderService for status update
      const result = await OrderService.updateOrderStatus({
        orderId: id,
        newStatus: status,
        updatedBy: req.user.id,
        updatedByType: req.user.role === 'admin' ? 'admin' : 'merchant',
        notes
      });
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json(result.order);
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

  // Cancel order (for customer cancellation)
  app.delete('/api/orders/:id', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`🗑️ DELETE ORDER REQUEST:`, {
        orderId: id,
        userId: req.user?.id,
        userRole: req.user?.role,
        timestamp: new Date().toISOString()
      });
      
      if (!req.user) {
        console.log(`🗑️❌ DELETE FAILED: No authentication`);
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // First, get the order to verify customer ownership
      const [existingOrder] = await db.select()
        .from(schema.orders)
        .where(eq(schema.orders.id, id))
        .limit(1);
      
      if (!existingOrder) {
        console.log(`🗑️❌ DELETE FAILED: Order ${id} not found`);
        return res.status(404).json({ error: 'Order not found' });
      }
      
      console.log(`🗑️🔍 DELETE ORDER CHECK:`, {
        orderId: id,
        orderCustomerId: existingOrder.customer_id,
        requestUserId: req.user.id,
        userRole: req.user.role,
        orderStatus: existingOrder.status
      });
      
      // Verify that the authenticated user is the customer who made this order or an admin
      if (req.user.role !== 'admin' && req.user.id !== existingOrder.customer_id) {
        console.log(`🗑️❌ DELETE FAILED: Permission denied`);
        return res.status(403).json({ error: 'You can only cancel your own orders' });
      }
      
      // Use centralized OrderService for cancellation
      const result = await OrderService.cancelOrder(
        id, 
        req.user.id, 
        req.user.role === 'admin' ? 'admin' : 'customer'
      );
      
      console.log(`🗑️📊 DELETE RESULT:`, {
        orderId: id,
        success: result.success,
        error: result.error
      });
      
      if (!result.success) {
        console.log(`🗑️❌ DELETE FAILED: ${result.error}`);
        return res.status(400).json({ error: result.error });
      }
      
      console.log(`🗑️✅ DELETE SUCCESS: Order ${id} cancelled`);
      res.json({ 
        message: 'Order cancelled successfully',
        order: result.order 
      });
    } catch (error) {
      console.error('🗑️💥 DELETE ERROR:', error);
      res.status(500).json({ error: 'Failed to cancel order' });
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

  // Get all orders (with filtering by customer, shop, type) - requires authentication
  app.get('/api/orders', authenticate, async (req, res) => {
    try {
      const { customerId, shopId, type } = req.query;
      
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Build WHERE conditions array
      const whereConditions = [];
      
      // Security check: ensure users can only access their own orders unless they're admin
      if (customerId && req.user.role !== 'admin') {
        if (req.user.id !== customerId) {
          return res.status(403).json({ error: 'Access denied: You can only view your own orders' });
        }
      }
      
      // Filter by customer ID
      if (customerId) {
        whereConditions.push(eq(schema.orders.customer_id, customerId as string));
      } else if (req.user.role === 'user') {
        // If no customerId specified and user is a customer, default to their own orders
        whereConditions.push(eq(schema.orders.customer_id, req.user.id));
      }
      
      // Filter by shop ID
      if (shopId) {
        whereConditions.push(eq(schema.orders.shop_id, shopId as string));
      }
      
      // Filter by type
      if (type && type !== 'all') {
        whereConditions.push(eq(schema.orders.order_type, type as string));
      }
      
      // Base query
      let query = db.select({
        order: schema.orders,
        product: schema.products,
        shop: schema.shops
      })
        .from(schema.orders)
        .leftJoin(schema.products, eq(schema.orders.product_id, schema.products.id))
        .leftJoin(schema.shops, eq(schema.orders.shop_id, schema.shops.id));
      
      // Apply WHERE conditions if any
      if (whereConditions.length > 0) {
        query = query.where(whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions));
      }
      
      // Add ordering
      query = query.orderBy(desc(schema.orders.created_at));
      
      const orders = await query;
      
      // Transform to match frontend expectations
      const transformedOrders = orders.map(({ order, product, shop }) => ({
        id: order.id,
        productId: order.product_id,
        shopId: order.shop_id,
        customerId: order.customer_id,
        customerName: order.customer_name,
        email: order.customer_email,
        status: order.status,
        createdAt: order.created_at,
        productName: product?.name || 'Unknown Product',
        shopName: shop?.name || 'Unknown Shop',
        productPrice: product?.price || 0,
        productImage: product?.image,
        timestamp: order.created_at // For backward compatibility
      }));
      
      res.json(transformedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
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