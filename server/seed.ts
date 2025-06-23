import { db, schema } from "./db";

// Inline mock data for seeding - based on the structure from mockData.ts
const seedData = {
  shops: [
    {
      id: 'shop_001',
      name: 'Brooklyn Bites',
      category: 'Food' as const,
      location: 'Near Sunset Blvd, LA',
      phone: '+1-555-123-4567',
      hours: '9am–8pm',
      business_email: 'sarah@brooklynbites.com',
      website: 'https://brooklynbites.com',
      social_links: 'instagram.com/brooklynbites',
      about_shop: 'Authentic Brooklyn-style food in the heart of LA',
      shop_photo: '/api/placeholder/400/300',
      owner_id: 'owner_001'
    },
    {
      id: 'shop_002',
      name: 'Maple Crafts',
      category: 'Gifts' as const,
      location: 'Downtown Portland',
      phone: '+1-555-234-5678',
      hours: '7am–9pm',
      business_email: 'mike@maplecrafts.com',
      website: 'https://maplecrafts.com',
      social_links: 'instagram.com/maplecrafts',
      about_shop: 'Handcrafted gifts and artisanal items',
      shop_photo: '/api/placeholder/400/300',
      owner_id: 'owner_002'
    },
    {
      id: 'shop_003',
      name: 'Sunset Souvenirs',
      category: 'Souvenirs' as const,
      location: 'Venice Beach Boardwalk',
      phone: '+1-555-345-6789',
      hours: '10am–10pm',
      business_email: 'emma@sunsetsouvenirs.com',
      website: 'https://sunsetsouvenirs.com',
      social_links: 'instagram.com/sunsetsouvenirs',
      about_shop: 'Unique souvenirs from Venice Beach',
      shop_photo: '/api/placeholder/400/300',
      owner_id: 'owner_003'
    }
  ],
  products: [
    {
      id: 'prod_001',
      shop_id: 'shop_001',
      name: 'Brooklyn Bagel',
      image: '/api/placeholder/300/200',
      price: 18,
      description: 'Fresh baked Brooklyn-style bagel with cream cheese',
      stock: 25
    },
    {
      id: 'prod_002',
      shop_id: 'shop_001',
      name: 'Classic NYC Pizza Slice',
      image: '/api/placeholder/300/200',
      price: 12,
      description: 'Authentic New York style pizza slice',
      stock: 15
    }
  ],
  orders: [
    {
      id: 'order_001',
      shop_id: 'shop_001',
      product_id: 'prod_001',
      customer_id: 'cust_001',
      customer_name: 'John Smith',
      customer_phone: '+1-555-123-4567',
      delivery_address: '123 Main St, Los Angeles, CA 90210',
      quantity: 2,
      total_amount: 36,
      status: 'pending' as const,
      order_date: '2024-12-22T10:30:00Z'
    },
    {
      id: 'order_002',
      shop_id: 'shop_001',
      product_id: 'prod_002',
      customer_id: 'cust_002',
      customer_name: 'Emily Davis',
      customer_phone: '+1-555-456-7890',
      delivery_address: '456 Oak Ave, Beverly Hills, CA 90212',
      quantity: 1,
      total_amount: 12,
      status: 'in_progress' as const,
      order_date: '2024-12-22T08:45:00Z'
    },
    {
      id: 'order_003',
      shop_id: 'shop_001',
      product_id: 'prod_001',
      customer_id: 'cust_003',
      customer_name: 'Michael Johnson',
      customer_phone: '+1-555-789-0123',
      delivery_address: '789 Pine St, Santa Monica, CA 90401',
      quantity: 1,
      total_amount: 18,
      status: 'delivered' as const,
      order_date: '2024-12-21T14:20:00Z'
    },
    {
      id: 'order_004',
      shop_id: 'shop_001',
      product_id: 'prod_002',
      customer_id: 'cust_004',
      customer_name: 'Sarah Wilson',
      customer_phone: '+1-555-111-2222',
      delivery_address: '321 Hollywood Blvd, Los Angeles, CA 90028',
      quantity: 3,
      total_amount: 36,
      status: 'in_progress' as const,
      order_date: '2024-12-22T09:15:00Z'
    },
    {
      id: 'order_005',
      shop_id: 'shop_001',
      product_id: 'prod_001',
      customer_id: 'cust_005',
      customer_name: 'David Miller',
      customer_phone: '+1-555-333-4444',
      delivery_address: '567 Sunset Blvd, Los Angeles, CA 90028',
      quantity: 2,
      total_amount: 36,
      status: 'pending' as const,
      order_date: '2024-12-22T11:30:00Z'
    }
  ]
};

async function seedDatabase() {
  console.log("🌱 Seeding database...");

  try {
    // Seed shops
    console.log("Seeding shops...");
    for (const shop of seedData.shops) {
      await db.insert(schema.shops).values({
        id: shop.id,
        name: shop.name,
        category: shop.category,
        location: shop.location,
        phone: shop.phone,
        hours: shop.hours,
        business_email: shop.business_email,
        website: shop.website,
        social_links: shop.social_links,
        about_shop: shop.about_shop,
        shop_photo: shop.shop_photo,
        status: "approved",
        owner_id: shop.owner_id,
        created_at: Date.now(),
        updated_at: Date.now(),
      }).onConflictDoNothing();
    }

    // Seed products
    console.log("Seeding products...");
    for (const product of seedData.products) {
      await db.insert(schema.products).values({
        id: product.id,
        shop_id: product.shop_id,
        name: product.name,
        image: product.image,
        price: product.price,
        description: product.description,
        stock: product.stock,
        created_at: Date.now(),
        updated_at: Date.now(),
      }).onConflictDoNothing();
    }

    // Seed orders
    console.log("Seeding orders...");
    for (const order of seedData.orders) {
      await db.insert(schema.orders).values({
        id: order.id,
        shop_id: order.shop_id,
        product_id: order.product_id,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        delivery_address: order.delivery_address,
        quantity: order.quantity,
        total_amount: order.total_amount,
        status: order.status,
        created_at: new Date(order.order_date).getTime(),
        updated_at: Date.now(),
      }).onConflictDoNothing();
    }

    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

// Run the seed function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => {
    console.log("🎉 Seeding complete!");
    process.exit(0);
  });
}