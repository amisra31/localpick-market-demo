import { db, schema } from '../db/index';
import { eq, and, inArray, not } from 'drizzle-orm';

/**
 * Database cleanup script to keep only 4 specific shops and their related data
 * Maintains referential integrity by deleting in proper order
 */

const SHOPS_TO_KEEP = [
  'Sticks Coffee',
  'Yosemite Gifts', 
  'The Mariposa Marketplace',
  'Cinnamon Roll Bakery'
];

async function cleanupDatabase() {
  console.log('🗄️ Starting database cleanup...');
  
  try {
    // Step 1: Find the shop IDs we want to keep
    const shopsToKeep = await db
      .select({ id: schema.shops.id, name: schema.shops.name })
      .from(schema.shops)
      .where(inArray(schema.shops.name, SHOPS_TO_KEEP));

    console.log('📍 Found shops to keep:', shopsToKeep.map(s => s.name));
    
    if (shopsToKeep.length === 0) {
      console.log('⚠️ No matching shops found. Aborting cleanup.');
      return;
    }

    const keepShopIds = shopsToKeep.map(s => s.id);

    // Step 2: Delete order messages for orders not related to kept shops
    console.log('🗑️ Cleaning up order messages...');
    const ordersToDelete = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(not(inArray(schema.orders.shop_id, keepShopIds)));

    if (ordersToDelete.length > 0) {
      const orderIdsToDelete = ordersToDelete.map(o => o.id);
      const deletedOrderMessages = await db
        .delete(schema.order_messages)
        .where(inArray(schema.order_messages.order_id, orderIdsToDelete));
      console.log(`✅ Deleted ${deletedOrderMessages.changes} order messages`);
    }

    // Step 3: Delete direct messages for shops not kept
    console.log('🗑️ Cleaning up direct messages...');
    const deletedDirectMessages = await db
      .delete(schema.direct_messages)
      .where(not(inArray(schema.direct_messages.shop_id, keepShopIds)));
    console.log(`✅ Deleted ${deletedDirectMessages.changes} direct messages`);

    // Step 4: Delete reservations for shops not kept
    console.log('🗑️ Cleaning up reservations...');
    const deletedReservations = await db
      .delete(schema.reservations)
      .where(not(inArray(schema.reservations.shop_id, keepShopIds)));
    console.log(`✅ Deleted ${deletedReservations.changes} reservations`);

    // Step 5: Delete orders for shops not kept
    console.log('🗑️ Cleaning up orders...');
    const deletedOrders = await db
      .delete(schema.orders)
      .where(not(inArray(schema.orders.shop_id, keepShopIds)));
    console.log(`✅ Deleted ${deletedOrders.changes} orders`);

    // Step 6: Delete operating hours for shops not kept
    console.log('🗑️ Cleaning up operating hours...');
    const deletedOperatingHours = await db
      .delete(schema.operating_hours)
      .where(not(inArray(schema.operating_hours.shop_id, keepShopIds)));
    console.log(`✅ Deleted ${deletedOperatingHours.changes} operating hour records`);

    // Step 7: Delete products for shops not kept
    console.log('🗑️ Cleaning up products...');
    const deletedProducts = await db
      .delete(schema.products)
      .where(not(inArray(schema.products.shop_id, keepShopIds)));
    console.log(`✅ Deleted ${deletedProducts.changes} products`);

    // Step 8: Delete shops not in keep list
    console.log('🗑️ Cleaning up shops...');
    const deletedShops = await db
      .delete(schema.shops)
      .where(not(inArray(schema.shops.name, SHOPS_TO_KEEP)));
    console.log(`✅ Deleted ${deletedShops.changes} shops`);

    // Step 9: Clean up orphaned users (shop owners with no shops)
    console.log('🗑️ Cleaning up orphaned shop owners...');
    const remainingShopOwnerIds = await db
      .select({ owner_id: schema.shops.owner_id })
      .from(schema.shops);
    
    const activeOwnerIds = remainingShopOwnerIds.map(s => s.owner_id);
    
    if (activeOwnerIds.length > 0) {
      const deletedUsers = await db
        .delete(schema.users)
        .where(and(
          eq(schema.users.role, 'merchant'),
          not(inArray(schema.users.id, activeOwnerIds))
        ));
      console.log(`✅ Deleted ${deletedUsers.changes} orphaned shop owner accounts`);
    }

    // Step 10: Verify cleanup results
    console.log('\n📊 Cleanup Results:');
    const remainingShops = await db.select().from(schema.shops);
    const remainingProducts = await db.select().from(schema.products);
    const remainingOrders = await db.select().from(schema.orders);
    const remainingMessages = await db.select().from(schema.direct_messages);

    console.log(`🏪 Remaining shops: ${remainingShops.length}`);
    remainingShops.forEach(shop => console.log(`   - ${shop.name}`));
    console.log(`📦 Remaining products: ${remainingProducts.length}`);
    console.log(`📋 Remaining orders: ${remainingOrders.length}`);
    console.log(`💬 Remaining messages: ${remainingMessages.length}`);

    console.log('\n✅ Database cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  }
}

// Run cleanup if this script is executed directly
// Note: Disabled auto-execution to prevent running during production startup
// if (import.meta.url === `file://${process.argv[1]}`) {
//   cleanupDatabase()
//     .then(() => process.exit(0))
//     .catch((error) => {
//       console.error(error);
//       process.exit(1);
//     });
// }

export { cleanupDatabase };