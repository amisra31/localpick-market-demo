// Enhanced data service with real-time sync capabilities
import { Shop, Product, Order, OrderMessage, OrderStatus } from '@/types';
import { userShopService } from './userShopService';

export class EnhancedDataService {
  private baseUrl: string;
  private eventSource: EventSource | null = null;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    // Set baseUrl dynamically for production compatibility
    this.baseUrl = this.getBaseUrl() + '/api';
    // Initialize Server-Sent Events for real-time updates
    this.initializeSSE();
  }

  private getBaseUrl(): string {
    // In production, use the current origin
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  }

  // Get authentication headers for API requests
  private getAuthHeaders(): Record<string, string> {
    return userShopService.getAuthHeaders();
  }

  private initializeSSE() {
    // TODO: Implement SSE when WebSocket/SSE endpoint is ready
    // this.eventSource = new EventSource(`${this.baseUrl}/events`);
    // this.eventSource.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   this.notifySubscribers(data.type, data.payload);
    // };
  }

  // Subscription system for real-time updates
  subscribe(event: string, callback: (data: any) => void) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(event)?.delete(callback);
    };
  }

  private notifySubscribers(event: string, data: any) {
    this.subscribers.get(event)?.forEach(callback => callback(data));
  }

  // ======= PRODUCTS API =======
  
  async getProducts(includeArchived: boolean = false): Promise<Product[]> {
    try {
      const response = await fetch(`${this.baseUrl}/products?includeArchived=${includeArchived}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const dbProducts = await response.json();
      
      return dbProducts.map((dbProduct: any) => this.transformProduct(dbProduct));
    } catch (error) {
      console.error('Failed to get all products:', error);
      return [];
    }
  }

  async getProductsByShopId(shopId: string, includeArchived: boolean = false): Promise<Product[]> {
    console.log(`📦🔍 FETCHING PRODUCTS BY SHOP:`, {
      shopId,
      includeArchived,
      authHeaders: this.getAuthHeaders()
    });
    
    const response = await fetch(`${this.baseUrl}/shops/${shopId}/products?includeArchived=${includeArchived}&_t=${Date.now()}`, {
      headers: {
        ...this.getAuthHeaders(),
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    console.log(`📦📡 PRODUCTS API RESPONSE:`, {
      shopId,
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`📦❌ PRODUCTS API ERROR:`, errorText);
      throw new Error('Failed to fetch products');
    }
    
    const dbProducts = await response.json();
    console.log(`📦✅ RAW PRODUCTS DATA:`, dbProducts);
    
    const transformedProducts = dbProducts.map((dbProduct: any) => this.transformProduct(dbProduct));
    console.log(`📦🔄 TRANSFORMED PRODUCTS:`, {
      shopId,
      count: transformedProducts.length,
      products: transformedProducts
    });
    
    return transformedProducts;
  }

  async getProductById(id: string): Promise<Product | null> {
    const response = await fetch(`${this.baseUrl}/products/${id}`);
    if (!response.ok) return null;
    const dbProduct = await response.json();
    
    return this.transformProduct(dbProduct);
  }

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const dbProductData = this.transformProductToDb(productData);
    
    const response = await fetch(`${this.baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbProductData)
    });
    if (!response.ok) throw new Error('Failed to create product');
    const dbProduct = await response.json();
    
    const product = this.transformProduct(dbProduct);
    
    // Notify subscribers of product creation
    this.notifySubscribers('product:created', product);
    
    return product;
  }

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
    const dbUpdateData = this.transformProductToDb(productData);
    
    const response = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbUpdateData)
    });
    if (!response.ok) throw new Error('Failed to update product');
    const dbProduct = await response.json();
    
    const product = this.transformProduct(dbProduct);
    
    // Notify subscribers of product update
    this.notifySubscribers('product:updated', product);
    
    return product;
  }

  async archiveProduct(id: string, archived: boolean = true): Promise<Product> {
    const response = await fetch(`${this.baseUrl}/products/${id}/archive`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived })
    });
    if (!response.ok) throw new Error('Failed to archive product');
    const dbProduct = await response.json();
    
    const product = this.transformProduct(dbProduct);
    
    // Notify subscribers of product archive/unarchive
    this.notifySubscribers('product:archived', { product, archived });
    
    return product;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      // Notify subscribers of product deletion
      this.notifySubscribers('product:deleted', { id });
      return true;
    }
    
    return false;
  }

  async bulkCreateProducts(products: Partial<Product>[], shopId: string): Promise<Product[]> {
    const response = await fetch(`${this.baseUrl}/products/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products, shopId })
    });
    if (!response.ok) throw new Error('Failed to create products');
    const result = await response.json();
    
    const transformedProducts = result.products.map((dbProduct: any) => this.transformProduct(dbProduct));
    
    // Notify subscribers of bulk product creation
    this.notifySubscribers('products:bulk-created', transformedProducts);
    
    return transformedProducts;
  }

  // ======= SHOPS API =======
  
  async getShops(): Promise<Shop[]> {
    const response = await fetch(`${this.baseUrl}/shops`);
    if (!response.ok) throw new Error('Failed to fetch shops');
    const dbShops = await response.json();
    
    return dbShops.map((dbShop: any) => this.transformShop(dbShop));
  }

  async getShopById(id: string): Promise<Shop | null> {
    const response = await fetch(`${this.baseUrl}/shops/${id}`);
    if (!response.ok) return null;
    const dbShop = await response.json();
    
    return this.transformShop(dbShop);
  }

  async getShopByOwnerId(ownerId: string): Promise<Shop | null> {
    const shops = await this.getShops();
    return shops.find(shop => shop.ownerId === ownerId) || null;
  }

  async getShopForCurrentUser(): Promise<Shop | null> {
    const user = userShopService.getCurrentUser();
    if (!user) return null;
    
    // If user has a shop_id (demo users), fetch that shop directly
    const shopId = userShopService.getCurrentUserShopId();
    if (shopId) {
      return await this.getShopById(shopId);
    }
    
    // Fallback to existing logic for regular users
    return await this.getShopByOwnerId(user.id);
  }

  /**
   * Get the current merchant ID for the logged-in user
   * This resolves ID mismatch issues by always using the actual user ID
   */
  getCurrentMerchantId(): string | null {
    return userShopService.getCurrentMerchantId();
  }

  /**
   * Make an authenticated API request
   */
  private async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers
    };

    return fetch(url, {
      ...options,
      headers
    });
  }

  async updateShop(id: string, shopData: Partial<Shop>): Promise<Shop> {
    const dbUpdateData = this.transformShopToDb(shopData);
    
    const response = await fetch(`${this.baseUrl}/shops/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbUpdateData)
    });
    if (!response.ok) throw new Error('Failed to update shop');
    const dbShop = await response.json();
    
    const shop = this.transformShop(dbShop);
    
    // Notify subscribers of shop update (affects customer views, admin dashboard)
    this.notifySubscribers('shop:updated', shop);
    
    return shop;
  }

  async createShop(shopData: Partial<Shop>): Promise<Shop> {
    const dbShopData = this.transformShopToDb(shopData);
    
    const response = await fetch(`${this.baseUrl}/shops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbShopData)
    });
    if (!response.ok) throw new Error('Failed to create shop');
    const dbShop = await response.json();
    
    const shop = this.transformShop(dbShop);
    
    // Notify subscribers of shop creation
    this.notifySubscribers('shop:created', shop);
    
    return shop;
  }

  async deleteShop(id: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/shops/${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      // Notify subscribers of shop deletion
      this.notifySubscribers('shop:deleted', { id });
      return true;
    }
    
    return false;
  }

  async updateShopHours(id: string, hours: any[]): Promise<Shop> {
    const response = await fetch(`${this.baseUrl}/shops/${id}/hours`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours })
    });
    if (!response.ok) throw new Error('Failed to update shop hours');
    const result = await response.json();
    
    const shop = this.transformShop(result);
    
    // Notify subscribers of shop hours update
    this.notifySubscribers('shop:hours-updated', shop);
    
    return shop;
  }

  // ======= ORDERS API =======
  
  async getOrdersByShopId(shopId: string, type: string = 'all'): Promise<Order[]> {
    const response = await fetch(`${this.baseUrl}/shops/${shopId}/orders?type=${type}`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch orders:', errorText);
      throw new Error('Failed to fetch orders');
    }
    
    const dbOrders = await response.json();
    return dbOrders.map((dbOrder: any) => this.transformOrder(dbOrder));
  }

  async getOrderById(id: string): Promise<Order | null> {
    const response = await fetch(`${this.baseUrl}/orders/${id}`);
    if (!response.ok) return null;
    const result = await response.json();
    
    return this.transformOrder(result.order);
  }

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const dbOrderData = this.transformOrderToDb(orderData);
    
    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbOrderData)
    });
    if (!response.ok) throw new Error('Failed to create order');
    const dbOrder = await response.json();
    
    const order = this.transformOrder(dbOrder);
    
    // Notify subscribers of new order (merchant dashboard, admin)
    this.notifySubscribers('order:created', order);
    
    return order;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    console.log(`📡🔄 EnhancedDataService: Updating order status:`, {
      orderId,
      status,
      timestamp: new Date().toISOString(),
      authHeaders: this.getAuthHeaders()
    });
    
    const response = await fetch(`${this.baseUrl}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify({ status })
    });
    
    console.log(`📡📨 API response:`, {
      orderId,
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`📡❌ API error:`, {
        orderId,
        status: response.status,
        error: errorText
      });
      throw new Error('Failed to update order status');
    }
    
    const dbOrder = await response.json();
    console.log(`📡✅ DB order response:`, { orderId, dbOrder });
    
    const order = this.transformOrder(dbOrder);
    console.log(`📡🔄 Transformed order:`, { orderId, transformedOrder: order });
    
    // Notify subscribers of order status update (all relevant users)
    this.notifySubscribers('order:status-updated', order);
    
    return order;
  }

  async createReservation(reservationData: {
    productId: string;
    shopId: string;
    customerName: string;
    email?: string;
    customerId?: string;
  }): Promise<Order> {
    // Convert reservation to order format
    const orderData = {
      product_id: reservationData.productId,
      shop_id: reservationData.shopId,
      customer_id: reservationData.customerId || `guest_${Date.now()}`,
      customer_name: reservationData.customerName,
      customer_email: reservationData.email,
      quantity: 1,
      total_amount: 0, // Will be calculated on backend
      status: 'pending' as OrderStatus,
      order_type: 'reservation'
    };
    
    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(orderData)
    });
    if (!response.ok) throw new Error('Failed to create reservation');
    const dbOrder = await response.json();
    
    const order = this.transformOrder(dbOrder);
    
    // Notify subscribers of new reservation
    this.notifySubscribers('reservation:created', order);
    
    return order;
  }

  async getReservationsByCustomer(customerId: string): Promise<any[]> {
    try {
      console.log(`📦🔍 FETCHING RESERVATIONS: customerId=${customerId}, baseUrl=${this.baseUrl}`);
      const response = await fetch(`${this.baseUrl}/orders?customerId=${customerId}`, {
        headers: this.getAuthHeaders()
      });
      
      console.log(`📦📡 RESERVATIONS API RESPONSE:`, {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`📦❌ RESERVATIONS API ERROR:`, errorText);
        return [];
      }
      
      const dbOrders = await response.json();
      console.log(`📦✅ RESERVATIONS DATA:`, dbOrders);
      
      const transformedOrders = dbOrders.map((dbOrder: any) => ({
        id: dbOrder.id,
        productId: dbOrder.productId,
        shopId: dbOrder.shopId,
        customerId: dbOrder.customerId,
        customerName: dbOrder.customerName,
        email: dbOrder.email,
        status: dbOrder.status,
        createdAt: dbOrder.createdAt,
        productName: dbOrder.productName || 'Product',
        shopName: dbOrder.shopName || 'Shop',
        productPrice: dbOrder.productPrice || 0,
        productImage: dbOrder.productImage,
        timestamp: dbOrder.createdAt // For backward compatibility
      }));
      
      console.log(`📦🔄 TRANSFORMED RESERVATIONS:`, transformedOrders);
      return transformedOrders;
    } catch (error) {
      console.error('📦💥 FAILED TO FETCH RESERVATIONS:', error);
      return [];
    }
  }

  // ======= MESSAGES API =======
  
  async getOrderMessages(orderId: string): Promise<OrderMessage[]> {
    const response = await fetch(`${this.baseUrl}/orders/${orderId}/messages`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch messages');
    const dbMessages = await response.json();
    
    return dbMessages.map((dbMessage: any) => this.transformMessage(dbMessage));
  }

  async sendOrderMessage(orderId: string, senderId: string, senderType: 'merchant' | 'customer', message: string): Promise<OrderMessage> {
    const response = await fetch(`${this.baseUrl}/orders/${orderId}/messages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify({
        sender_id: senderId,
        sender_type: senderType,
        message
      })
    });
    if (!response.ok) throw new Error('Failed to send message');
    const dbMessage = await response.json();
    
    const orderMessage = this.transformMessage(dbMessage);
    
    // Notify subscribers of new message (both merchant and customer)
    this.notifySubscribers('message:sent', orderMessage);
    
    return orderMessage;
  }

  // Get conversations for a shop (merchant view)
  async getShopConversations(shopId: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/shops/${shopId}/direct-conversations`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch shop conversations');
    return await response.json();
  }

  // Get messages between customer and shop
  async getDirectMessages(customerId: string, shopId: string): Promise<any[]> {
    const response = await this.makeAuthenticatedRequest(`${this.baseUrl}/messages?customer_id=${customerId}&shop_id=${shopId}`);
    if (!response.ok) throw new Error('Failed to fetch direct messages');
    return await response.json();
  }

  // Send direct message using current user as sender
  async sendDirectMessage(customerId: string, shopId: string, senderType: 'merchant' | 'customer', message: string, productId?: string): Promise<any> {
    // Get current user ID instead of requiring it as parameter
    const senderId = userShopService.getCurrentUser()?.id;
    if (!senderId) {
      throw new Error('User not authenticated');
    }

    const response = await this.makeAuthenticatedRequest(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customerId,
        shop_id: shopId,
        product_id: productId,
        sender_id: senderId,
        sender_type: senderType,
        message
      })
    });
    if (!response.ok) throw new Error('Failed to send direct message');
    return await response.json();
  }

  // Get shop conversations with authentication
  async getShopDirectConversations(shopId: string): Promise<any[]> {
    const response = await this.makeAuthenticatedRequest(`${this.baseUrl}/shops/${shopId}/direct-conversations`);
    if (!response.ok) throw new Error('Failed to fetch shop conversations');
    return await response.json();
  }

  // ======= TRANSFORMATION METHODS =======
  
  private transformProduct(dbProduct: any): Product {
    return {
      id: dbProduct.id,
      shopId: dbProduct.shop_id,
      name: dbProduct.name,
      image: dbProduct.image,
      price: dbProduct.price,
      description: dbProduct.description,
      stock: dbProduct.stock,
      isArchived: dbProduct.is_archived || false,
      archivedAt: dbProduct.archived_at ? new Date(dbProduct.archived_at).toISOString() : undefined
    };
  }

  private transformProductToDb(product: Partial<Product>): any {
    const dbProduct: any = {};
    if (product.shopId) dbProduct.shop_id = product.shopId;
    if (product.name) dbProduct.name = product.name;
    if (product.image) dbProduct.image = product.image;
    if (product.price !== undefined) dbProduct.price = product.price;
    if (product.description) dbProduct.description = product.description;
    if (product.stock !== undefined) dbProduct.stock = product.stock;
    if (product.isArchived !== undefined) dbProduct.is_archived = product.isArchived;
    if (product.archivedAt) dbProduct.archived_at = new Date(product.archivedAt).getTime();
    return dbProduct;
  }

  private transformShop(dbShop: any): Shop {
    return {
      id: dbShop.id,
      name: dbShop.name,
      category: dbShop.category,
      location: dbShop.location,
      phone: dbShop.phone,
      hours: dbShop.hours,
      ownerId: dbShop.owner_id,
      businessEmail: dbShop.business_email,
      website: dbShop.website,
      socialLinks: dbShop.social_links,
      shopPhoto: dbShop.shop_photo,
      aboutShop: dbShop.about_shop,
      status: dbShop.status,
      submittedAt: dbShop.submitted_at ? new Date(dbShop.submitted_at).toISOString() : undefined,
      approvedAt: dbShop.approved_at ? new Date(dbShop.approved_at).toISOString() : undefined,
      rejectedAt: dbShop.rejected_at ? new Date(dbShop.rejected_at).toISOString() : undefined,
      rejectionReason: dbShop.rejection_reason
    };
  }

  private transformShopToDb(shop: Partial<Shop>): any {
    const dbShop: any = {};
    if (shop.name) dbShop.name = shop.name;
    if (shop.category) dbShop.category = shop.category;
    if (shop.location) dbShop.location = shop.location;
    if (shop.phone) dbShop.phone = shop.phone;
    if (shop.hours) dbShop.hours = shop.hours;
    if (shop.businessEmail) dbShop.business_email = shop.businessEmail;
    if (shop.website) dbShop.website = shop.website;
    if (shop.socialLinks) dbShop.social_links = shop.socialLinks;
    if (shop.shopPhoto) dbShop.shop_photo = shop.shopPhoto;
    if (shop.aboutShop) dbShop.about_shop = shop.aboutShop;
    if (shop.status) dbShop.status = shop.status;
    return dbShop;
  }

  private transformOrder(dbOrder: any): Order {
    return {
      id: dbOrder.id,
      shopId: dbOrder.shop_id,
      productId: dbOrder.product_id,
      customerId: dbOrder.customer_id,
      customerName: dbOrder.customer_name,
      customerPhone: dbOrder.customer_phone,
      customerEmail: dbOrder.customer_email,
      deliveryAddress: dbOrder.delivery_address,
      quantity: dbOrder.quantity,
      totalAmount: dbOrder.total_amount,
      status: dbOrder.status,
      orderType: dbOrder.order_type || 'order',
      orderDate: new Date(dbOrder.created_at).toISOString(),
      createdAt: new Date(dbOrder.created_at).toISOString(),
      updatedAt: new Date(dbOrder.updated_at).toISOString()
    };
  }

  private transformOrderToDb(order: Partial<Order>): any {
    const dbOrder: any = {};
    if (order.shopId) dbOrder.shop_id = order.shopId;
    if (order.productId) dbOrder.product_id = order.productId;
    if (order.customerId) dbOrder.customer_id = order.customerId;
    if (order.customerName) dbOrder.customer_name = order.customerName;
    if (order.customerPhone) dbOrder.customer_phone = order.customerPhone;
    if (order.customerEmail) dbOrder.customer_email = order.customerEmail;
    if (order.deliveryAddress) dbOrder.delivery_address = order.deliveryAddress;
    if (order.quantity !== undefined) dbOrder.quantity = order.quantity;
    if (order.totalAmount !== undefined) dbOrder.total_amount = order.totalAmount;
    if (order.status) dbOrder.status = order.status;
    if (order.orderType) dbOrder.order_type = order.orderType;
    return dbOrder;
  }

  private transformMessage(dbMessage: any): OrderMessage {
    return {
      id: dbMessage.id,
      orderId: dbMessage.order_id,
      senderId: dbMessage.sender_id,
      senderType: dbMessage.sender_type,
      message: dbMessage.message,
      timestamp: new Date(dbMessage.created_at).toISOString()
    };
  }

  // ======= CLEANUP =======
  
  destroy() {
    if (this.eventSource) {
      this.eventSource.close();
    }
    this.subscribers.clear();
  }
}

export const enhancedDataService = new EnhancedDataService();