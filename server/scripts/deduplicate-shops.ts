import { db, schema } from '../db/index';
import { eq, and } from 'drizzle-orm';

/**
 * Remove duplicate shops by keeping the first occurrence of each shop name
 * Also ensure we have all 4 required shops
 */

const REQUIRED_SHOPS = [
  { name: 'Sticks Coffee', category: 'Coffee shop' },
  { name: 'Yosemite Gifts', category: 'Gift shop' },
  { name: 'The Mariposa Marketplace', category: 'Gift shop' },
  { name: 'Cinnamon Roll Bakery & Café', category: 'Coffee shop' }
];

async function deduplicateShops() {
  console.log('🔧 Starting shop deduplication...');

  try {
    // Step 1: Get all shops
    const allShops = await db.select().from(schema.shops);
    console.log(`📊 Found ${allShops.length} total shops`);

    // Step 2: Group shops by name
    const shopsByName = new Map<string, any[]>();
    allShops.forEach(shop => {
      const name = shop.name.trim();
      if (!shopsByName.has(name)) {
        shopsByName.set(name, []);
      }
      shopsByName.get(name)!.push(shop);
    });

    // Step 3: Remove duplicates (keep first occurrence)
    for (const [name, shops] of shopsByName.entries()) {
      if (shops.length > 1) {
        console.log(`🗑️ Found ${shops.length} duplicates for "${name}"`);
        
        // Keep the first shop, delete the rest
        const toKeep = shops[0];
        const toDelete = shops.slice(1);
        
        for (const shop of toDelete) {
          // Delete related data first
          await db.delete(schema.products).where(eq(schema.products.shop_id, shop.id));
          await db.delete(schema.direct_messages).where(eq(schema.direct_messages.shop_id, shop.id));
          await db.delete(schema.reservations).where(eq(schema.reservations.shop_id, shop.id));
          await db.delete(schema.operating_hours).where(eq(schema.operating_hours.shop_id, shop.id));
          
          // Delete the shop
          await db.delete(schema.shops).where(eq(schema.shops.id, shop.id));
          console.log(`   ✅ Deleted duplicate shop: ${shop.id}`);
        }
      }
    }

    // Step 4: Check if we have all required shops
    const currentShops = await db.select().from(schema.shops);
    const currentShopNames = currentShops.map(s => s.name);
    
    for (const requiredShop of REQUIRED_SHOPS) {
      const exists = currentShopNames.some(name => 
        name.toLowerCase().includes(requiredShop.name.toLowerCase()) ||
        requiredShop.name.toLowerCase().includes(name.toLowerCase())
      );
      
      if (!exists) {
        console.log(`➕ Adding missing shop: ${requiredShop.name}`);
        
        // Generate ID
        const shopId = `shop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create owner (users table uses auto-increment integer ID)
        const ownerResult = await db.insert(schema.users).values({
          email: `${requiredShop.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          password: 'placeholder_password',
          name: `${requiredShop.name} Owner`,
          role: 'merchant',
          created_at: Date.now(),
          updated_at: Date.now()
        }).returning({ id: schema.users.id });
        
        const ownerId = ownerResult[0].id.toString();
        
        // Create shop
        await db.insert(schema.shops).values({
          id: shopId,
          name: requiredShop.name,
          category: requiredShop.category as any,
          location: 'Mariposa, CA 95338, United States',
          phone: '+1-555-000-0000',
          hours: 'Mon-Fri: 8AM-6PM',
          business_email: `${requiredShop.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          website: null,
          social_links: null,
          about_shop: `Welcome to ${requiredShop.name}`,
          shop_photo: null,
          status: 'approved',
          owner_id: ownerId,
          submitted_at: Date.now(),
          approved_at: Date.now(),
          rejected_at: null,
          rejection_reason: null,
          created_at: Date.now(),
          updated_at: Date.now()
        });
        
        console.log(`   ✅ Created shop: ${requiredShop.name}`);
      }
    }

    // Step 5: Final verification
    const finalShops = await db.select().from(schema.shops);
    console.log('\n📊 Final Results:');
    console.log(`🏪 Total shops: ${finalShops.length}`);
    finalShops.forEach(shop => console.log(`   - ${shop.name}`));

    console.log('\n✅ Shop deduplication completed successfully!');

  } catch (error) {
    console.error('❌ Shop deduplication failed:', error);
    throw error;
  }
}

export { deduplicateShops };