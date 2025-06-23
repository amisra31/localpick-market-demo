
import { Shop, Product, Reservation, ShopOwner, ShopStatus, Order, OrderMessage, OrderStatus } from '@/types';

// Mock shop owners for login
export const mockShopOwners: ShopOwner[] = [
  { id: 'owner_001', name: 'Sarah Johnson', email: 'sarah@brooklynbites.com' },
  { id: 'owner_002', name: 'Mike Chen', email: 'mike@maplecrafts.com' },
  { id: 'owner_003', name: 'Emma Rodriguez', email: 'emma@sunsetsouvenirs.com' },
];

// Initial mock data with USA context
const initialShops: Shop[] = [
  {
    id: 'shop_001',
    name: 'Brooklyn Bites',
    category: 'Food',
    location: 'Near Sunset Blvd, LA',
    phone: '+1-555-123-4567',
    hours: '9am–8pm',
    ownerId: 'owner_001',
    status: 'approved',
    approvedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'shop_002',
    name: 'Maple Crafts',
    category: 'Gifts',
    location: 'Downtown Portland',
    phone: '+1-555-234-5678',
    hours: '7am–9pm',
    ownerId: 'owner_002',
    status: 'approved',
    approvedAt: '2024-02-01T14:30:00Z'
  },
  {
    id: 'shop_003',
    name: 'Sunset Souvenirs',
    category: 'Souvenirs',
    location: 'Venice Beach Boardwalk',
    phone: '+1-555-345-6789',
    hours: '10am–10pm',
    ownerId: 'owner_003',
    status: 'approved',
    approvedAt: '2024-02-10T09:15:00Z'
  }
];

const initialProducts: Product[] = [
  {
    id: 'prod_001',
    shopId: 'shop_001',
    name: 'Pumpkin Pie',
    image: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400&h=400&fit=crop&crop=center',
    price: 18,
    description: 'Fresh homemade pumpkin pie with whipped cream',
    stock: 8
  },
  {
    id: 'prod_002',
    shopId: 'shop_001',
    name: 'Apple Cider Donuts',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=400&fit=crop&crop=center',
    price: 12,
    description: 'Warm cinnamon sugar donuts, perfect for fall',
    stock: 5
  },
  {
    id: 'prod_003',
    shopId: 'shop_002',
    name: 'Handmade Candles',
    image: 'https://images.unsplash.com/photo-1602874801006-5dec0c9c44e8?w=400&h=400&fit=crop&crop=center',
    price: 25,
    description: 'Artisan soy candles with natural scents',
    stock: 3
  },
  {
    id: 'prod_004',
    shopId: 'shop_002',
    name: 'Wooden Photo Frame',
    image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=400&fit=crop&crop=center',
    price: 35,
    description: 'Handcrafted maple wood picture frame',
    stock: 0
  },
  {
    id: 'prod_005',
    shopId: 'shop_003',
    name: 'Yosemite Keychain',
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400&h=400&fit=crop&crop=center',
    price: 8,
    description: 'Metal keychain featuring Yosemite National Park',
    stock: 12
  },
  {
    id: 'prod_006',
    shopId: 'shop_003',
    name: 'California Postcard Set',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=center',
    price: 15,
    description: 'Beautiful vintage-style postcards of California landmarks',
    stock: 7
  }
];

// Initial mock orders
const initialOrders: Order[] = [
  {
    id: 'order_001',
    shopId: 'shop_001',
    productId: 'prod_001',
    customerId: 'cust_001',
    customerName: 'John Smith',
    customerPhone: '+1-555-987-6543',
    deliveryAddress: '123 Main St, Los Angeles, CA 90210',
    quantity: 1,
    totalAmount: 18,
    status: 'pending',
    createdAt: '2024-12-22T10:30:00Z',
    updatedAt: '2024-12-22T10:30:00Z'
  },
  {
    id: 'order_002',
    shopId: 'shop_001',
    productId: 'prod_002',
    customerId: 'cust_002',
    customerName: 'Emily Davis',
    customerPhone: '+1-555-456-7890',
    deliveryAddress: '456 Oak Ave, Beverly Hills, CA 90212',
    quantity: 2,
    totalAmount: 24,
    status: 'in_progress',
    createdAt: '2024-12-22T09:15:00Z',
    updatedAt: '2024-12-22T11:45:00Z'
  },
  {
    id: 'order_003',
    shopId: 'shop_002',
    productId: 'prod_003',
    customerId: 'cust_003',
    customerName: 'Michael Brown',
    customerPhone: '+1-555-321-0987',
    deliveryAddress: '789 Pine St, Portland, OR 97201',
    quantity: 1,
    totalAmount: 25,
    status: 'delivered',
    createdAt: '2024-12-21T14:20:00Z',
    updatedAt: '2024-12-22T08:30:00Z'
  },
  {
    id: 'order_004',
    shopId: 'shop_001',
    productId: 'prod_001',
    customerId: 'cust_004',
    customerName: 'Sarah Wilson',
    customerPhone: '+1-555-789-0123',
    deliveryAddress: '321 Elm St, Santa Monica, CA 90401',
    quantity: 1,
    totalAmount: 18,
    status: 'cancelled',
    createdAt: '2024-12-21T16:45:00Z',
    updatedAt: '2024-12-21T18:20:00Z'
  },
  // Additional orders for shop_001 (Brooklyn Bites - Sarah Johnson)
  {
    id: 'order_005',
    shopId: 'shop_001',
    productId: 'prod_002',
    customerId: 'cust_005',
    customerName: 'David Miller',
    customerPhone: '+1-555-111-2222',
    deliveryAddress: '567 Sunset Blvd, Los Angeles, CA 90028',
    quantity: 3,
    totalAmount: 36,
    status: 'pending',
    createdAt: '2024-12-22T14:20:00Z',
    updatedAt: '2024-12-22T14:20:00Z'
  },
  {
    id: 'order_006',
    shopId: 'shop_001',
    productId: 'prod_001',
    customerId: 'cust_006',
    customerName: 'Lisa Anderson',
    customerPhone: '+1-555-333-4444',
    deliveryAddress: '890 Hollywood Blvd, Hollywood, CA 90028',
    quantity: 2,
    totalAmount: 36,
    status: 'delivered',
    createdAt: '2024-12-21T11:30:00Z',
    updatedAt: '2024-12-22T09:15:00Z'
  },
  {
    id: 'order_007',
    shopId: 'shop_001',
    productId: 'prod_002',
    customerId: 'cust_007',
    customerName: 'Robert Garcia',
    customerPhone: '+1-555-555-6666',
    deliveryAddress: '234 Venice Beach Blvd, Venice, CA 90291',
    quantity: 1,
    totalAmount: 12,
    status: 'in_progress',
    createdAt: '2024-12-22T08:45:00Z',
    updatedAt: '2024-12-22T12:30:00Z'
  },
  {
    id: 'order_008',
    shopId: 'shop_001',
    productId: 'prod_001',
    customerId: 'cust_008',
    customerName: 'Jennifer Lee',
    customerPhone: '+1-555-777-8888',
    deliveryAddress: '456 Melrose Ave, West Hollywood, CA 90069',
    quantity: 1,
    totalAmount: 18,
    status: 'pending',
    createdAt: '2024-12-22T15:10:00Z',
    updatedAt: '2024-12-22T15:10:00Z'
  },
  {
    id: 'order_009',
    shopId: 'shop_001',
    productId: 'prod_002',
    customerId: 'cust_002',
    customerName: 'Emily Davis',
    customerPhone: '+1-555-456-7890',
    deliveryAddress: '456 Oak Ave, Beverly Hills, CA 90212',
    quantity: 1,
    totalAmount: 12,
    status: 'delivered',
    createdAt: '2024-12-20T16:20:00Z',
    updatedAt: '2024-12-21T10:30:00Z'
  },
  {
    id: 'order_010',
    shopId: 'shop_001',
    productId: 'prod_001',
    customerId: 'cust_009',
    customerName: 'Kevin Thompson',
    customerPhone: '+1-555-999-0000',
    deliveryAddress: '789 Rodeo Drive, Beverly Hills, CA 90210',
    quantity: 2,
    totalAmount: 36,
    status: 'cancelled',
    createdAt: '2024-12-19T13:45:00Z',
    updatedAt: '2024-12-19T15:20:00Z'
  },
  {
    id: 'order_011',
    shopId: 'shop_001',
    productId: 'prod_002',
    customerId: 'cust_010',
    customerName: 'Maria Rodriguez',
    customerPhone: '+1-555-123-9876',
    deliveryAddress: '321 Wilshire Blvd, Santa Monica, CA 90401',
    quantity: 4,
    totalAmount: 48,
    status: 'in_progress',
    createdAt: '2024-12-22T07:30:00Z',
    updatedAt: '2024-12-22T13:45:00Z'
  },
  {
    id: 'order_012',
    shopId: 'shop_001',
    productId: 'prod_001',
    customerId: 'cust_011',
    customerName: 'James Parker',
    customerPhone: '+1-555-246-8135',
    deliveryAddress: '654 La Brea Ave, Los Angeles, CA 90036',
    quantity: 1,
    totalAmount: 18,
    status: 'pending',
    createdAt: '2024-12-22T16:00:00Z',
    updatedAt: '2024-12-22T16:00:00Z'
  },
  {
    id: 'order_013',
    shopId: 'shop_001',
    productId: 'prod_002',
    customerId: 'cust_005',
    customerName: 'David Miller',
    customerPhone: '+1-555-111-2222',
    deliveryAddress: '567 Sunset Blvd, Los Angeles, CA 90028',
    quantity: 2,
    totalAmount: 24,
    status: 'delivered',
    createdAt: '2024-12-18T12:15:00Z',
    updatedAt: '2024-12-19T08:30:00Z'
  },
  {
    id: 'order_014',
    shopId: 'shop_001',
    productId: 'prod_001',
    customerId: 'cust_012',
    customerName: 'Amanda White',
    customerPhone: '+1-555-369-2580',
    deliveryAddress: '987 Fairfax Ave, Los Angeles, CA 90046',
    quantity: 1,
    totalAmount: 18,
    status: 'in_progress',
    createdAt: '2024-12-22T06:45:00Z',
    updatedAt: '2024-12-22T11:20:00Z'
  },
  {
    id: 'order_015',
    shopId: 'shop_001',
    productId: 'prod_002',
    customerId: 'cust_013',
    customerName: 'Christopher Clark',
    customerPhone: '+1-555-147-2583',
    deliveryAddress: '159 Pico Blvd, Santa Monica, CA 90405',
    quantity: 3,
    totalAmount: 36,
    status: 'pending',
    createdAt: '2024-12-22T17:30:00Z',
    updatedAt: '2024-12-22T17:30:00Z'
  }
];

class MockDataService {
  private shops: Shop[] = [];
  private products: Product[] = [];
  private reservations: Reservation[] = [];
  private orders: Order[] = [];
  private orderMessages: OrderMessage[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    // Force reset with new American context data
    this.shops = [...initialShops];
    this.products = [...initialProducts];
    this.orders = [...initialOrders];
    
    const savedReservations = localStorage.getItem('localpick_reservations');
    this.reservations = savedReservations ? JSON.parse(savedReservations) : [];
    
    const savedOrders = localStorage.getItem('localpick_orders');
    if (savedOrders) {
      this.orders = JSON.parse(savedOrders);
    }
    
    const savedOrderMessages = localStorage.getItem('localpick_order_messages');
    this.orderMessages = savedOrderMessages ? JSON.parse(savedOrderMessages) : [];

    this.saveData();
  }

  private saveData() {
    localStorage.setItem('localpick_shops', JSON.stringify(this.shops));
    localStorage.setItem('localpick_products', JSON.stringify(this.products));
    localStorage.setItem('localpick_reservations', JSON.stringify(this.reservations));
    localStorage.setItem('localpick_orders', JSON.stringify(this.orders));
    localStorage.setItem('localpick_order_messages', JSON.stringify(this.orderMessages));
  }

  // Shop methods
  getShops(): Shop[] {
    return [...this.shops];
  }

  getShopById(id: string): Shop | undefined {
    return this.shops.find(shop => shop.id === id);
  }

  getShopByOwnerId(ownerId: string): Shop | undefined {
    return this.shops.find(shop => shop.ownerId === ownerId);
  }

  createShop(shop: Omit<Shop, 'id'>): Shop {
    const existingShop = this.shops.find(s => s.name.toLowerCase() === shop.name.toLowerCase());
    if (existingShop) {
      throw new Error('Shop name already exists');
    }

    const newShop: Shop = {
      ...shop,
      id: `shop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'draft'
    };

    this.shops.push(newShop);
    this.saveData();
    return newShop;
  }

  updateShop(id: string, updates: Partial<Omit<Shop, 'id'>>): Shop {
    const index = this.shops.findIndex(shop => shop.id === id);
    if (index === -1) {
      throw new Error('Shop not found');
    }

    if (updates.name) {
      const existingShop = this.shops.find(s => s.name.toLowerCase() === updates.name!.toLowerCase() && s.id !== id);
      if (existingShop) {
        throw new Error('Shop name already exists');
      }
    }

    this.shops[index] = { ...this.shops[index], ...updates };
    this.saveData();
    return this.shops[index];
  }

  submitShopForApproval(shopId: string): Shop {
    const index = this.shops.findIndex(shop => shop.id === shopId);
    if (index === -1) {
      throw new Error('Shop not found');
    }

    if (this.shops[index].status === 'pending_approval') {
      throw new Error('Shop is already submitted for approval');
    }

    if (this.shops[index].status === 'approved') {
      throw new Error('Shop is already approved');
    }

    this.shops[index] = {
      ...this.shops[index],
      status: 'pending_approval',
      submittedAt: new Date().toISOString()
    };
    
    this.saveData();
    return this.shops[index];
  }

  // Admin methods for approval/rejection
  approveShop(shopId: string): Shop {
    const index = this.shops.findIndex(shop => shop.id === shopId);
    if (index === -1) {
      throw new Error('Shop not found');
    }

    this.shops[index] = {
      ...this.shops[index],
      status: 'approved',
      approvedAt: new Date().toISOString()
    };
    
    this.saveData();
    return this.shops[index];
  }

  rejectShop(shopId: string, reason: string): Shop {
    const index = this.shops.findIndex(shop => shop.id === shopId);
    if (index === -1) {
      throw new Error('Shop not found');
    }

    this.shops[index] = {
      ...this.shops[index],
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason
    };
    
    this.saveData();
    return this.shops[index];
  }

  // Product methods
  getProducts(): Product[] {
    return [...this.products];
  }

  getProductById(id: string): Product | undefined {
    return this.products.find(product => product.id === id);
  }

  getProductsByShopId(shopId: string): Product[] {
    return this.products.filter(product => product.shopId === shopId);
  }

  createProduct(product: Omit<Product, 'id'>): Product {
    const newProduct: Product = {
      ...product,
      id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.products.push(newProduct);
    this.saveData();
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Omit<Product, 'id'>>): Product {
    const index = this.products.findIndex(product => product.id === id);
    if (index === -1) {
      throw new Error('Product not found');
    }

    this.products[index] = { ...this.products[index], ...updates };
    this.saveData();
    return this.products[index];
  }

  deleteProduct(id: string): boolean {
    const index = this.products.findIndex(product => product.id === id);
    if (index === -1) {
      return false;
    }

    this.products.splice(index, 1);
    this.saveData();
    return true;
  }

  // Reservation methods
  getReservations(): Reservation[] {
    return [...this.reservations];
  }

  createReservation(reservation: Omit<Reservation, 'id' | 'timestamp'>): Reservation {
    const product = this.getProductById(reservation.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.stock <= 0) {
      throw new Error('Product is out of stock');
    }

    // Decrease stock
    this.updateProduct(product.id, { stock: product.stock - 1 });

    const newReservation: Reservation = {
      ...reservation,
      id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    this.reservations.push(newReservation);
    this.saveData();
    return newReservation;
  }

  getCustomerReservations(customerName: string): Reservation[] {
    return this.reservations.filter(res => res.customerName === customerName);
  }

  // Order methods
  getOrders(): Order[] {
    return [...this.orders];
  }

  getOrderById(id: string): Order | undefined {
    return this.orders.find(order => order.id === id);
  }

  getOrdersByShopId(shopId: string): Order[] {
    return this.orders.filter(order => order.shopId === shopId);
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Order {
    const index = this.orders.findIndex(order => order.id === orderId);
    if (index === -1) {
      throw new Error('Order not found');
    }

    this.orders[index] = {
      ...this.orders[index],
      status,
      updatedAt: new Date().toISOString()
    };
    
    this.saveData();
    return this.orders[index];
  }

  // Order messaging methods
  getOrderMessages(orderId: string): OrderMessage[] {
    return this.orderMessages.filter(msg => msg.orderId === orderId);
  }

  sendOrderMessage(orderId: string, senderId: string, senderType: 'merchant' | 'customer', message: string): OrderMessage {
    const newMessage: OrderMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      senderId,
      senderType,
      message,
      timestamp: new Date().toISOString()
    };

    this.orderMessages.push(newMessage);
    this.saveData();
    return newMessage;
  }
}

export const mockDataService = new MockDataService();
