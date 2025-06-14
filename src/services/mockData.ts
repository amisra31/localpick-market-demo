import { Shop, Product, Reservation, ShopOwner } from '@/types';

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
    hours: '9am–8pm',
    ownerId: 'owner_001'
  },
  {
    id: 'shop_002',
    name: 'Maple Crafts',
    category: 'Gifts',
    location: 'Downtown Portland',
    hours: '7am–9pm',
    ownerId: 'owner_002'
  },
  {
    id: 'shop_003',
    name: 'Sunset Souvenirs',
    category: 'Souvenirs',
    location: 'Venice Beach Boardwalk',
    hours: '10am–10pm',
    ownerId: 'owner_003'
  }
];

const initialProducts: Product[] = [
  {
    id: 'prod_001',
    shopId: 'shop_001',
    name: 'Pumpkin Pie',
    image: 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=400&h=400&fit=crop&crop=center',
    price: 18,
    description: 'Fresh homemade pumpkin pie with whipped cream',
    stock: 8
  },
  {
    id: 'prod_002',
    shopId: 'shop_001',
    name: 'Apple Cider Donuts',
    image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop&crop=center',
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

class MockDataService {
  private shops: Shop[] = [];
  private products: Product[] = [];
  private reservations: Reservation[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    // Force reset with new American context data
    this.shops = [...initialShops];
    this.products = [...initialProducts];
    
    const savedReservations = localStorage.getItem('localpick_reservations');
    this.reservations = savedReservations ? JSON.parse(savedReservations) : [];

    this.saveData();
  }

  private saveData() {
    localStorage.setItem('localpick_shops', JSON.stringify(this.shops));
    localStorage.setItem('localpick_products', JSON.stringify(this.products));
    localStorage.setItem('localpick_reservations', JSON.stringify(this.reservations));
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
      id: `shop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
}

export const mockDataService = new MockDataService();
