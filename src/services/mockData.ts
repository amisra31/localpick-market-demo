
import { Shop, Product, Reservation, ShopOwner } from '@/types';

// Mock shop owners for login
export const mockShopOwners: ShopOwner[] = [
  { id: 'owner_001', name: 'Rajesh Kumar', email: 'rajesh@gangasweets.com' },
  { id: 'owner_002', name: 'Priya Sharma', email: 'priya@creamygifts.com' },
  { id: 'owner_003', name: 'Amit Singh', email: 'amit@delhisouvenirs.com' },
];

// Initial mock data
const initialShops: Shop[] = [
  {
    id: 'shop_001',
    name: 'Ganga Sweets',
    category: 'Food',
    location: 'Sector 5',
    hours: '10am–9pm',
    ownerId: 'owner_001'
  },
  {
    id: 'shop_002',
    name: 'Creamy Gifts',
    category: 'Gifts',
    location: 'Connaught Place',
    hours: '9am–10pm',
    ownerId: 'owner_002'
  },
  {
    id: 'shop_003',
    name: 'Delhi Souvenirs',
    category: 'Souvenirs',
    location: 'Red Fort Area',
    hours: '8am–8pm',
    ownerId: 'owner_003'
  }
];

const initialProducts: Product[] = [
  {
    id: 'prod_001',
    shopId: 'shop_001',
    name: 'Besan Ladoo',
    image: '/placeholder.svg',
    price: 120,
    description: 'Fresh homemade ladoos made with pure ghee',
    stock: 5
  },
  {
    id: 'prod_002',
    shopId: 'shop_001',
    name: 'Gulab Jamun',
    image: '/placeholder.svg',
    price: 80,
    description: 'Soft and spongy gulab jamuns in sugar syrup',
    stock: 0
  },
  {
    id: 'prod_003',
    shopId: 'shop_002',
    name: 'Handmade Candles',
    image: '/placeholder.svg',
    price: 250,
    description: 'Beautiful aromatic handmade candles',
    stock: 3
  },
  {
    id: 'prod_004',
    shopId: 'shop_003',
    name: 'Mini Taj Mahal',
    image: '/placeholder.svg',
    price: 500,
    description: 'Decorative miniature Taj Mahal replica',
    stock: 2
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
