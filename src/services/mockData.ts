import { Shop, Product, Reservation, ShopOwner } from '@/types';

// Mock shop owners for login
export const mockShopOwners: ShopOwner[] = [
  { id: 'owner_001', name: 'Sarah Johnson', email: 'sarah@sunnydaleGifts.com' },
  { id: 'owner_002', name: 'Mike Chen', email: 'mike@chicagodeli.com' },
  { id: 'owner_003', name: 'Emma Rodriguez', email: 'emma@manhattansouvenirs.com' },
];

// Initial mock data with USA context
const initialShops: Shop[] = [
  {
    id: 'shop_001',
    name: 'Sunnydale Gifts',
    category: 'Gifts',
    location: 'Downtown LA',
    hours: '9am–8pm',
    ownerId: 'owner_001'
  },
  {
    id: 'shop_002',
    name: 'Chicago Deli',
    category: 'Food',
    location: '5th Avenue',
    hours: '7am–9pm',
    ownerId: 'owner_002'
  },
  {
    id: 'shop_003',
    name: 'Manhattan Souvenirs',
    category: 'Souvenirs',
    location: 'Times Square',
    hours: '10am–10pm',
    ownerId: 'owner_003'
  }
];

const initialProducts: Product[] = [
  {
    id: 'prod_001',
    shopId: 'shop_001',
    name: 'Handcrafted Candles',
    image: '/placeholder.svg',
    price: 25,
    description: 'Beautiful scented candles made locally',
    stock: 8
  },
  {
    id: 'prod_002',
    shopId: 'shop_001',
    name: 'Artisan Photo Frame',
    image: '/placeholder.svg',
    price: 35,
    description: 'Elegant wooden photo frames',
    stock: 3
  },
  {
    id: 'prod_003',
    shopId: 'shop_002',
    name: 'Pumpkin Pie',
    image: '/placeholder.svg',
    price: 18,
    description: 'Fresh homemade pumpkin pie',
    stock: 5
  },
  {
    id: 'prod_004',
    shopId: 'shop_002',
    name: 'Maple Syrup',
    image: '/placeholder.svg',
    price: 22,
    description: 'Pure Vermont maple syrup',
    stock: 0
  },
  {
    id: 'prod_005',
    shopId: 'shop_003',
    name: 'NYC T-shirt',
    image: '/placeholder.svg',
    price: 28,
    description: 'Classic New York City souvenir t-shirt',
    stock: 12
  },
  {
    id: 'prod_006',
    shopId: 'shop_003',
    name: 'Statue of Liberty Keychain',
    image: '/placeholder.svg',
    price: 8,
    description: 'Iconic Statue of Liberty metal keychain',
    stock: 1
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
    const savedShops = localStorage.getItem('localpick_shops');
    const savedProducts = localStorage.getItem('localpick_products');
    const savedReservations = localStorage.getItem('localpick_reservations');

    this.shops = savedShops ? JSON.parse(savedShops) : initialShops;
    this.products = savedProducts ? JSON.parse(savedProducts) : initialProducts;
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
