import { User, InsertUser, Shop, InsertShop, Product, InsertProduct, Reservation, InsertReservation } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Shop operations
  getShop(id: number): Promise<Shop | undefined>;
  getShopsByOwner(ownerId: number): Promise<Shop[]>;
  getAllShops(): Promise<Shop[]>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: number, updates: Partial<InsertShop>): Promise<Shop | undefined>;
  
  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getProductsByShop(shopId: number): Promise<Product[]>;
  getAllProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  
  // Reservation operations
  getReservation(id: number): Promise<Reservation | undefined>;
  getReservationsByUser(userId: number): Promise<Reservation[]>;
  getReservationsByShop(shopId: number): Promise<Reservation[]>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  updateReservation(id: number, updates: Partial<InsertReservation>): Promise<Reservation | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private shops: Map<number, Shop>;
  private products: Map<number, Product>;
  private reservations: Map<number, Reservation>;
  private currentUserId: number;
  private currentShopId: number;
  private currentProductId: number;
  private currentReservationId: number;

  constructor() {
    this.users = new Map();
    this.shops = new Map();
    this.products = new Map();
    this.reservations = new Map();
    this.currentUserId = 1;
    this.currentShopId = 1;
    this.currentProductId = 1;
    this.currentReservationId = 1;
    
    this.initializeData();
  }

  private initializeData() {
    // Create demo users
    const demoUsers = [
      { email: 'customer@demo.com', password: 'demo123', role: 'user' as const, name: 'Customer Demo' },
      { email: 'merchant@demo.com', password: 'demo123', role: 'merchant' as const, name: 'Merchant Demo' },
      { email: 'admin@demo.com', password: 'demo123', role: 'admin' as const, name: 'Admin Demo' }
    ];

    demoUsers.forEach(userData => {
      const user: User = {
        id: this.currentUserId++,
        ...userData,
        shop_id: userData.role === 'merchant' ? '1' : null,
        created_at: new Date()
      };
      this.users.set(user.id, user);
    });

    // Create demo shops
    const shop1: Shop = {
      id: this.currentShopId++,
      name: 'Brooklyn Bites',
      category: 'Food',
      location: 'Near Sunset Blvd, LA',
      hours: '9am–8pm',
      owner_id: 2,
      created_at: new Date()
    };
    this.shops.set(shop1.id, shop1);

    const shop2: Shop = {
      id: this.currentShopId++,
      name: 'Maple Crafts',
      category: 'Gifts',
      location: 'Downtown Portland',
      hours: '7am–9pm',
      owner_id: 2,
      created_at: new Date()
    };
    this.shops.set(shop2.id, shop2);

    // Create demo products
    const products = [
      {
        shop_id: 1,
        name: 'Pumpkin Pie',
        image: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400&h=400&fit=crop&crop=center',
        price: 1800,
        description: 'Fresh homemade pumpkin pie with whipped cream',
        stock: 8
      },
      {
        shop_id: 1,
        name: 'Apple Cider Donuts',
        image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=400&fit=crop&crop=center',
        price: 1200,
        description: 'Warm cinnamon sugar donuts, perfect for fall',
        stock: 5
      },
      {
        shop_id: 2,
        name: 'Handmade Candles',
        image: 'https://images.unsplash.com/photo-1602874801006-5dec0c9c44e8?w=400&h=400&fit=crop&crop=center',
        price: 2500,
        description: 'Artisan soy candles with natural scents',
        stock: 3
      }
    ];

    products.forEach(productData => {
      const product: Product = {
        id: this.currentProductId++,
        ...productData,
        created_at: new Date()
      };
      this.products.set(product.id, product);
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      id,
      email: insertUser.email,
      password: insertUser.password,
      name: insertUser.name || null,
      role: insertUser.role || 'user',
      shop_id: insertUser.shop_id || null,
      created_at: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Shop operations
  async getShop(id: number): Promise<Shop | undefined> {
    return this.shops.get(id);
  }

  async getShopsByOwner(ownerId: number): Promise<Shop[]> {
    return Array.from(this.shops.values()).filter(shop => shop.owner_id === ownerId);
  }

  async getAllShops(): Promise<Shop[]> {
    return Array.from(this.shops.values());
  }

  async createShop(insertShop: InsertShop): Promise<Shop> {
    const id = this.currentShopId++;
    const shop: Shop = {
      id,
      name: insertShop.name,
      category: insertShop.category,
      location: insertShop.location,
      hours: insertShop.hours,
      owner_id: insertShop.owner_id || null,
      created_at: new Date()
    };
    this.shops.set(id, shop);
    return shop;
  }

  async updateShop(id: number, updates: Partial<InsertShop>): Promise<Shop | undefined> {
    const shop = this.shops.get(id);
    if (!shop) return undefined;
    
    const updatedShop = { ...shop, ...updates };
    this.shops.set(id, updatedShop);
    return updatedShop;
  }

  // Product operations
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsByShop(shopId: number): Promise<Product[]> {
    return Array.from(this.products.values()).filter(product => product.shop_id === shopId);
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const product: Product = {
      id,
      shop_id: insertProduct.shop_id,
      name: insertProduct.name,
      image: insertProduct.image,
      price: insertProduct.price,
      description: insertProduct.description,
      stock: insertProduct.stock || 0,
      created_at: new Date()
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    const updatedProduct = { ...product, ...updates };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  // Reservation operations
  async getReservation(id: number): Promise<Reservation | undefined> {
    return this.reservations.get(id);
  }

  async getReservationsByUser(userId: number): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(reservation => reservation.user_id === userId);
  }

  async getReservationsByShop(shopId: number): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(reservation => reservation.shop_id === shopId);
  }

  async createReservation(insertReservation: InsertReservation): Promise<Reservation> {
    const id = this.currentReservationId++;
    const reservation: Reservation = {
      id,
      product_id: insertReservation.product_id,
      shop_id: insertReservation.shop_id,
      user_id: insertReservation.user_id || null,
      customer_name: insertReservation.customer_name,
      email: insertReservation.email || null,
      status: insertReservation.status || 'active',
      created_at: new Date()
    };
    this.reservations.set(id, reservation);
    return reservation;
  }

  async updateReservation(id: number, updates: Partial<InsertReservation>): Promise<Reservation | undefined> {
    const reservation = this.reservations.get(id);
    if (!reservation) return undefined;
    
    const updatedReservation = { ...reservation, ...updates };
    this.reservations.set(id, updatedReservation);
    return updatedReservation;
  }
}

export const storage = new MemStorage();
