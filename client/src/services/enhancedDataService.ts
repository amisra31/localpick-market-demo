// Enhanced data service with real-time sync capabilities
import { Shop, Product, Order, OrderMessage, OrderStatus } from '@/types';

export class EnhancedDataService {
  private baseUrl = '/api';
  private eventSource: EventSource | null = null;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    // Initialize Server-Sent Events for real-time updates
    this.initializeSSE();
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
    const response = await fetch(`${this.baseUrl}/shops/${shopId}/products?includeArchived=${includeArchived}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    const dbProducts = await response.json();
    
    return dbProducts.map((dbProduct: any) => this.transformProduct(dbProduct));
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
    const response = await fetch(`${this.baseUrl}/shops/${shopId}/orders?type=${type}`);
    if (!response.ok) throw new Error('Failed to fetch orders');
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
    const response = await fetch(`${this.baseUrl}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error('Failed to update order status');
    const dbOrder = await response.json();
    
    const order = this.transformOrder(dbOrder);
    
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
      headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`${this.baseUrl}/orders?customerId=${customerId}&type=reservation`);
      if (!response.ok) return [];
      const dbOrders = await response.json();
      
      return dbOrders.map((dbOrder: any) => ({
        id: dbOrder.id,
        productId: dbOrder.product_id,
        shopId: dbOrder.shop_id,
        customerId: dbOrder.customer_id,
        customerName: dbOrder.customer_name,
        email: dbOrder.customer_email,
        status: dbOrder.status,
        createdAt: dbOrder.created_at,
        productName: dbOrder.product_name || 'Product',
        shopName: dbOrder.shop_name || 'Shop',
        productPrice: dbOrder.product_price || 0,
        productImage: dbOrder.product_image,
        timestamp: dbOrder.created_at // For backward compatibility
      }));
    } catch (error) {
      console.error('Failed to fetch customer reservations:', error);
      return [];
    }
  }

  // ======= MESSAGES API =======
  
  async getOrderMessages(orderId: string): Promise<OrderMessage[]> {
    const response = await fetch(`${this.baseUrl}/orders/${orderId}/messages`);
    if (!response.ok) throw new Error('Failed to fetch messages');
    const dbMessages = await response.json();
    
    return dbMessages.map((dbMessage: any) => this.transformMessage(dbMessage));
  }

  async sendOrderMessage(orderId: string, senderId: string, senderType: 'merchant' | 'customer', message: string): Promise<OrderMessage> {
    const response = await fetch(`${this.baseUrl}/orders/${orderId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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