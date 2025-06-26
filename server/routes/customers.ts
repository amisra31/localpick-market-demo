import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { db, schema } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const router = Router();

// Get customer's chat threads (shops they've chatted with)
router.get('/:customerId/chat-threads', authenticate, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // Get all shops the customer has chatted with
    const allMessages = await db
      .select({
        shop_id: schema.direct_messages.shop_id,
        shop_name: schema.shops.name,
        shop_category: schema.shops.category,
        created_at: schema.direct_messages.created_at,
        is_read: schema.direct_messages.is_read,
        sender_type: schema.direct_messages.sender_type
      })
      .from(schema.direct_messages)
      .leftJoin(schema.shops, eq(schema.direct_messages.shop_id, schema.shops.id))
      .where(eq(schema.direct_messages.customer_id, customerId))
      .orderBy(desc(schema.direct_messages.created_at));

    // Group by shop_id to get threads
    const threadMap = new Map();
    allMessages.forEach(msg => {
      if (!threadMap.has(msg.shop_id)) {
        threadMap.set(msg.shop_id, {
          shop_id: msg.shop_id,
          shop_name: msg.shop_name,
          shop_category: msg.shop_category,
          last_activity: msg.created_at,
          unread_count: 0,
          messages: []
        });
      }
      const thread = threadMap.get(msg.shop_id);
      if (msg.created_at > thread.last_activity) {
        thread.last_activity = msg.created_at;
      }
      if (!msg.is_read && msg.sender_type === 'merchant') {
        thread.unread_count++;
      }
    });

    const threads = Array.from(threadMap.values());
    
    // Get last message for each thread (simplified for now)
    const threadsWithLastMessage = await Promise.all(
      threads.map(async thread => {
        const lastMessage = await db
          .select()
          .from(schema.direct_messages)
          .where(and(
            eq(schema.direct_messages.shop_id, thread.shop_id),
            eq(schema.direct_messages.customer_id, customerId)
          ))
          .orderBy(desc(schema.direct_messages.created_at))
          .limit(1);
        
        return {
          ...thread,
          unread_count: 0, // TODO: Implement unread count
          last_message: lastMessage[0]
        };
      })
    );
    
    res.json(threadsWithLastMessage);
  } catch (error) {
    console.error('Error fetching chat threads:', error);
    res.status(500).json({ error: 'Failed to fetch chat threads' });
  }
});

// Get customer's wishlist
router.get('/:customerId/wishlist', authenticate, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const wishlistItems = await db
      .select({
        id: schema.wishlist_items.id,
        productId: schema.wishlist_items.product_id,
        shopId: schema.wishlist_items.shop_id,
        productName: schema.products.name,
        productPrice: schema.products.price,
        productImage: schema.products.image,
        shopName: schema.shops.name,
        shopCategory: schema.shops.category,
        createdAt: schema.wishlist_items.created_at
      })
      .from(schema.wishlist_items)
      .leftJoin(schema.products, eq(schema.wishlist_items.product_id, schema.products.id))
      .leftJoin(schema.shops, eq(schema.wishlist_items.shop_id, schema.shops.id))
      .where(eq(schema.wishlist_items.customer_id, customerId))
      .orderBy(desc(schema.wishlist_items.created_at));
    
    res.json(wishlistItems);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// Add item to wishlist
router.post('/:customerId/wishlist', authenticate, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { productId, shopId } = req.body;
    
    // Check if item already exists in wishlist
    const existing = await db
      .select()
      .from(schema.wishlist_items)
      .where(and(
        eq(schema.wishlist_items.customer_id, customerId),
        eq(schema.wishlist_items.product_id, productId)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Item already in wishlist' });
    }
    
    const id = nanoid();
    const now = Date.now();
    
    const [newItem] = await db
      .insert(schema.wishlist_items)
      .values({
        id,
        customer_id: customerId,
        product_id: productId,
        shop_id: shopId,
        created_at: now
      })
      .returning();
    
    res.status(201).json({ id, message: 'Item added to wishlist' });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// Remove item from wishlist by product ID
router.delete('/:customerId/wishlist/product/:productId', authenticate, async (req, res) => {
  try {
    const { customerId, productId } = req.params;
    
    const result = await db
      .delete(schema.wishlist_items)
      .where(and(
        eq(schema.wishlist_items.customer_id, customerId),
        eq(schema.wishlist_items.product_id, productId)
      ));
    
    res.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

// Remove item from wishlist by item ID (keep for backward compatibility)
router.delete('/wishlist/:wishlistItemId', authenticate, async (req, res) => {
  try {
    const { wishlistItemId } = req.params;
    
    const result = await db
      .delete(schema.wishlist_items)
      .where(eq(schema.wishlist_items.id, wishlistItemId));
    
    res.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

export default router;