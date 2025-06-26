import type { Express } from "express";
import { eq, and, desc, not } from "drizzle-orm";
import { db, schema } from "../db";
import { nanoid } from "nanoid";
import { getWebSocketManager } from "../websocket";
import { authenticate, requireShopOwnership } from "../middleware/auth";

export function registerMessageRoutes(app: Express) {
  // Get chat threads for a customer - API endpoint as requested
  app.get('/api/chat/threads', authenticate, async (req, res) => {
    try {
      const { user_id } = req.query;
      
      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }

      // Get all shops the customer has chatted with
      const allMessages = await db
        .select({
          shop_id: schema.direct_messages.shop_id,
          shop_name: schema.shops.name,
          shop_category: schema.shops.category,
          message_id: schema.direct_messages.id,
          message: schema.direct_messages.message,
          sender_type: schema.direct_messages.sender_type,
          is_read: schema.direct_messages.is_read,
          created_at: schema.direct_messages.created_at
        })
        .from(schema.direct_messages)
        .leftJoin(schema.shops, eq(schema.direct_messages.shop_id, schema.shops.id))
        .where(eq(schema.direct_messages.customer_id, user_id as string))
        .orderBy(desc(schema.direct_messages.created_at));

      // Group by shop_id to create threads
      const threadMap = new Map();
      
      allMessages.forEach(msg => {
        if (!threadMap.has(msg.shop_id)) {
          threadMap.set(msg.shop_id, {
            shop_id: msg.shop_id,
            shop_name: msg.shop_name,
            shop_category: msg.shop_category,
            last_message: {
              id: msg.message_id,
              message: msg.message,
              sender_type: msg.sender_type,
              created_at: msg.created_at
            },
            unread_count: 0,
            last_activity: msg.created_at,
            messages: []
          });
        }
        
        const thread = threadMap.get(msg.shop_id);
        
        // Add message to thread history
        thread.messages.push({
          id: msg.message_id,
          message: msg.message,
          sender_type: msg.sender_type,
          is_read: msg.is_read,
          created_at: msg.created_at
        });
        
        // Update last message if this is newer
        if (msg.created_at > thread.last_activity) {
          thread.last_message = {
            id: msg.message_id,
            message: msg.message,
            sender_type: msg.sender_type,
            created_at: msg.created_at
          };
          thread.last_activity = msg.created_at;
        }
        
        // Count unread messages from merchants
        if (!msg.is_read && msg.sender_type === 'merchant') {
          thread.unread_count++;
        }
      });

      // Convert to array and sort by last activity
      const threads = Array.from(threadMap.values())
        .sort((a, b) => b.last_activity - a.last_activity);

      res.json(threads);
    } catch (error) {
      console.error('Error fetching chat threads:', error);
      res.status(500).json({ error: 'Failed to fetch chat threads' });
    }
  });
  // Get all direct message conversations for a shop (merchant view)
  app.get('/api/shops/:shopId/direct-conversations', authenticate, requireShopOwnership, async (req, res) => {
    try {
      const { shopId } = req.params;
      
      // Get all messages for this shop
      const messages = await db.select()
        .from(schema.direct_messages)
        .where(eq(schema.direct_messages.shop_id, shopId))
        .orderBy(schema.direct_messages.created_at);
      
      // Group by customer and get conversation summaries
      const customerMap = new Map();
      
      messages.forEach(message => {
        const customerId = message.customer_id;
        
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customer_id: customerId,
            customer_name: `Customer ${customerId.slice(-4)}`,
            last_message: message,
            unread_count: 0,
            last_activity: message.created_at,
            total_messages: 0
          });
        }
        
        const conversation = customerMap.get(customerId);
        conversation.total_messages++;
        
        // Update last message if this one is newer
        if (message.created_at > conversation.last_activity) {
          conversation.last_message = message;
          conversation.last_activity = message.created_at;
        }
        
        // Count unread messages from customers
        if (!message.is_read && message.sender_type === 'customer') {
          conversation.unread_count++;
        }
      });
      
      // Convert to array and sort by last activity
      const conversations = Array.from(customerMap.values())
        .sort((a, b) => b.last_activity - a.last_activity);
      
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching shop conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  // Get direct conversation between customer and shop
  app.get('/api/messages', async (req, res) => {
    try {
      const { customer_id, shop_id, product_id } = req.query;
      
      if (!customer_id || !shop_id) {
        return res.status(400).json({ error: 'customer_id and shop_id are required' });
      }
      
      let query = db.select()
        .from(schema.direct_messages)
        .where(and(
          eq(schema.direct_messages.customer_id, customer_id as string),
          eq(schema.direct_messages.shop_id, shop_id as string)
        ))
        .orderBy(schema.direct_messages.created_at);
      
      // Filter by product if specified
      if (product_id) {
        query = query.where(eq(schema.direct_messages.product_id, product_id as string));
      }
      
      const messages = await query;
      res.json(messages);
    } catch (error) {
      console.error('Error fetching direct messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Send direct message
  app.post('/api/messages', async (req, res) => {
    try {
      const { customer_id, shop_id, product_id, sender_id, sender_type, message } = req.body;
      
      if (!customer_id || !shop_id || !sender_id || !sender_type || !message?.trim()) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      if (!['merchant', 'customer'].includes(sender_type)) {
        return res.status(400).json({ error: 'Invalid sender type' });
      }
      
      const messageData = {
        id: nanoid(),
        customer_id,
        shop_id,
        product_id: product_id || null,
        sender_id,
        sender_type,
        message: message.trim(),
        is_read: false,
        created_at: Date.now()
      };
      
      const [newMessage] = await db.insert(schema.direct_messages).values(messageData).returning();
      
      // Broadcast message to WebSocket clients in real-time
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcastMessage(customer_id, shop_id, product_id, newMessage);
      }
      
      res.status(201).json(newMessage);
    } catch (error) {
      console.error('Error sending direct message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // Mark messages as read
  app.patch('/api/messages/mark-read', async (req, res) => {
    try {
      const { customer_id, shop_id, reader_id } = req.body;
      
      if (!customer_id || !shop_id || !reader_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Mark all messages as read for this conversation where the reader is NOT the sender
      await db.update(schema.direct_messages)
        .set({ is_read: true })
        .where(and(
          eq(schema.direct_messages.customer_id, customer_id),
          eq(schema.direct_messages.shop_id, shop_id),
          eq(schema.direct_messages.is_read, false),
          // Don't mark own messages as read
          not(eq(schema.direct_messages.sender_id, reader_id))
        ));
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  });

  // Get unread count for direct messages
  app.get('/api/messages/unread-count', async (req, res) => {
    try {
      const { user_id, user_type } = req.query;
      
      if (!user_id || !user_type) {
        return res.status(400).json({ error: 'user_id and user_type are required' });
      }
      
      let unreadCount = 0;
      
      if (user_type === 'customer') {
        // Count unread messages where customer is recipient
        const result = await db.select({ count: schema.direct_messages.id })
          .from(schema.direct_messages)
          .where(and(
            eq(schema.direct_messages.customer_id, user_id as string),
            eq(schema.direct_messages.is_read, false),
            eq(schema.direct_messages.sender_type, 'merchant')
          ));
        unreadCount = result.length;
      } else if (user_type === 'merchant') {
        // For merchants, find their shop and count unread messages
        const shops = await db.select()
          .from(schema.shops)
          .where(eq(schema.shops.owner_id, user_id as string));
        
        if (shops.length > 0) {
          const result = await db.select({ count: schema.direct_messages.id })
            .from(schema.direct_messages)
            .where(and(
              eq(schema.direct_messages.shop_id, shops[0].id),
              eq(schema.direct_messages.is_read, false),
              eq(schema.direct_messages.sender_type, 'customer')
            ));
          unreadCount = result.length;
        }
      }
      
      res.json({ unread_count: unreadCount });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  });
  // Get messages for an order
  app.get('/api/orders/:orderId/messages', async (req, res) => {
    try {
      const { orderId } = req.params;
      const messages = await db.select()
        .from(schema.order_messages)
        .where(eq(schema.order_messages.order_id, orderId))
        .orderBy(schema.order_messages.created_at);
      
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Send message
  app.post('/api/orders/:orderId/messages', async (req, res) => {
    try {
      const { orderId } = req.params;
      const { sender_id, sender_type, message } = req.body;
      
      if (!sender_id || !sender_type || !message?.trim()) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      if (!['merchant', 'customer'].includes(sender_type)) {
        return res.status(400).json({ error: 'Invalid sender type' });
      }
      
      const messageData = {
        id: nanoid(),
        order_id: orderId,
        sender_id,
        sender_type,
        message: message.trim(),
        created_at: Date.now()
      };
      
      const [newMessage] = await db.insert(schema.order_messages).values(messageData).returning();
      
      // Real-time sync: Broadcast to both merchant and customer via WebSocket
      const wsManager = getWebSocketManager();
      if (wsManager) {
        // Get order details to find customer_id and shop_id for broadcasting
        const order = await db.select()
          .from(schema.orders)
          .where(eq(schema.orders.id, orderId))
          .limit(1);
          
        if (order.length > 0) {
          wsManager.broadcastMessage(order[0].customer_id, order[0].shop_id, null, newMessage);
        }
      }
      
      res.status(201).json(newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // Get conversation thread for a customer-merchant pair
  app.get('/api/conversations/:customerId/:shopId', async (req, res) => {
    try {
      const { customerId, shopId } = req.params;
      
      // Get all orders between this customer and shop
      const orders = await db.select()
        .from(schema.orders)
        .where(and(
          eq(schema.orders.customer_id, customerId),
          eq(schema.orders.shop_id, shopId)
        ));
      
      if (orders.length === 0) {
        return res.json([]);
      }
      
      const orderIds = orders.map(order => order.id);
      
      // Get all messages for these orders
      const messages = await db.select({
        message: schema.order_messages,
        order: schema.orders
      })
        .from(schema.order_messages)
        .leftJoin(schema.orders, eq(schema.order_messages.order_id, schema.orders.id))
        .where(eq(schema.order_messages.order_id, orderIds[0])) // Start with first order ID
        .orderBy(schema.order_messages.created_at);
      
      // TODO: Improve this to handle multiple order IDs properly
      
      res.json(messages);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  });

  // Get all conversations for a shop (merchant view)
  app.get('/api/shops/:shopId/conversations', authenticate, requireShopOwnership, async (req, res) => {
    try {
      const { shopId } = req.params;
      
      // Get unique customers who have orders with this shop
      const customerOrders = await db.select({
        customer_id: schema.orders.customer_id,
        customer_name: schema.orders.customer_name,
        customer_email: schema.orders.customer_email,
        latest_order_id: schema.orders.id,
        latest_order_date: schema.orders.created_at
      })
        .from(schema.orders)
        .where(eq(schema.orders.shop_id, shopId))
        .orderBy(desc(schema.orders.created_at));
      
      // Group by customer and get latest order for each
      const customers = new Map();
      
      customerOrders.forEach(order => {
        if (!customers.has(order.customer_id) || 
            order.latest_order_date > customers.get(order.customer_id).latest_order_date) {
          customers.set(order.customer_id, order);
        }
      });
      
      const uniqueCustomers = Array.from(customers.values());
      
      // For each customer, get their latest message count
      const conversations = await Promise.all(
        uniqueCustomers.map(async (customer) => {
          const messageCount = await db.select({ count: schema.order_messages.id })
            .from(schema.order_messages)
            .leftJoin(schema.orders, eq(schema.order_messages.order_id, schema.orders.id))
            .where(and(
              eq(schema.orders.customer_id, customer.customer_id),
              eq(schema.orders.shop_id, shopId)
            ));
          
          return {
            ...customer,
            message_count: messageCount.length,
            has_unread: false // TODO: Implement unread message tracking
          };
        })
      );
      
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching shop conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  // Mark messages as read
  app.post('/api/messages/mark-read', async (req, res) => {
    try {
      const { order_id, user_id, user_type } = req.body;
      
      // TODO: Implement message read status tracking
      // This would require adding a read_status table or updating the messages table
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  });

  // Get unread message count for a user
  app.get('/api/users/:userId/unread-count', async (req, res) => {
    try {
      const { userId } = req.params;
      const { user_type } = req.query; // 'merchant' or 'customer'
      
      // TODO: Implement unread message counting
      // This would require message read status tracking
      
      res.json({ unread_count: 0 });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  });
}