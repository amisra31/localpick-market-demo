// Database-backed data service
import { Shop, Product, Order, OrderMessage, OrderStatus } from '@/types';

export class DataService {
  private baseUrl = '/api';

  // ======= SHOPS API =======
  
  async getShops(): Promise<Shop[]> {
    const response = await fetch(`${this.baseUrl}/shops`);
    if (!response.ok) throw new Error('Failed to fetch shops');
    const dbShops = await response.json();
    
    // Transform database format to frontend format
    return dbShops.map((dbShop: any) => ({
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
    }));
  }

  async getShopById(id: string): Promise<Shop | null> {
    const response = await fetch(`${this.baseUrl}/shops/${id}`);
    if (!response.ok) return null;
    const dbShop = await response.json();
    
    // Transform database format to frontend format
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

  async getShopByOwnerId(ownerId: string): Promise<Shop | null> {
    const shops = await this.getShops();
    return shops.find(shop => shop.ownerId === ownerId) || null;
  }

  async createShop(shopData: Partial<Shop>): Promise<Shop> {
    const response = await fetch(`${this.baseUrl}/shops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shopData)
    });
    if (!response.ok) throw new Error('Failed to create shop');
    return response.json();
  }

  async updateShop(id: string, shopData: Partial<Shop>): Promise<Shop> {
    const response = await fetch(`${this.baseUrl}/shops/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shopData)
    });
    if (!response.ok) throw new Error('Failed to update shop');
    return response.json();
  }

  // ======= PRODUCTS API =======
  
  async getProducts(): Promise<Product[]> {
    // Get all products from all shops
    try {
      const shops = await this.getShops();
      const allProducts: Product[] = [];
      
      for (const shop of shops) {
        const shopProducts = await this.getProductsByShopId(shop.id);
        allProducts.push(...shopProducts);
      }
      
      return allProducts;
    } catch (error) {
      console.error('Failed to get all products:', error);
      return [];
    }
  }

  async getProductsByShopId(shopId: string): Promise<Product[]> {
    const response = await fetch(`${this.baseUrl}/shops/${shopId}/products`);
    if (!response.ok) throw new Error('Failed to fetch products');
    const dbProducts = await response.json();
    
    // Transform database format to frontend format
    return dbProducts.map((dbProduct: any) => ({
      id: dbProduct.id,
      shopId: dbProduct.shop_id,
      name: dbProduct.name,
      image: dbProduct.image,
      price: dbProduct.price,
      description: dbProduct.description,
      stock: dbProduct.stock
    }));
  }

  async getProductById(id: string): Promise<Product | null> {
    const response = await fetch(`${this.baseUrl}/products/${id}`);
    if (!response.ok) return null;
    const dbProduct = await response.json();
    
    // Transform database format to frontend format
    return {
      id: dbProduct.id,
      shopId: dbProduct.shop_id,
      name: dbProduct.name,
      image: dbProduct.image,
      price: dbProduct.price,
      description: dbProduct.description,
      stock: dbProduct.stock
    };
  }

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const response = await fetch(`${this.baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    if (!response.ok) throw new Error('Failed to create product');
    return response.json();
  }

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
    const response = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    if (!response.ok) throw new Error('Failed to update product');
    return response.json();
  }

  async deleteProduct(id: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'DELETE'
    });
    return response.ok;
  }

  // ======= ORDERS API =======
  
  async getOrders(): Promise<Order[]> {
    // For now, get all orders from shop_001 (Brooklyn Bites)
    return this.getOrdersByShopId('shop_001');
  }

  async getOrdersByShopId(shopId: string): Promise<Order[]> {
    const response = await fetch(`${this.baseUrl}/shops/${shopId}/orders`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    const dbOrders = await response.json();
    
    // Transform database format to frontend format
    return dbOrders.map((dbOrder: any) => ({
      id: dbOrder.id,
      shopId: dbOrder.shop_id,
      productId: dbOrder.product_id,
      customerId: dbOrder.customer_id,
      customerName: dbOrder.customer_name,
      customerPhone: dbOrder.customer_phone,
      deliveryAddress: dbOrder.delivery_address,
      quantity: dbOrder.quantity,
      totalAmount: dbOrder.total_amount,
      status: dbOrder.status,
      orderDate: new Date(dbOrder.created_at).toISOString(),
      createdAt: new Date(dbOrder.created_at).toISOString(),
      updatedAt: new Date(dbOrder.updated_at).toISOString()
    }));
  }

  async getOrderById(id: string): Promise<Order | null> {
    const response = await fetch(`${this.baseUrl}/orders/${id}`);
    if (!response.ok) return null;
    const dbOrder = await response.json();
    
    // Transform database format to frontend format
    return {
      id: dbOrder.id,
      shopId: dbOrder.shop_id,
      productId: dbOrder.product_id,
      customerId: dbOrder.customer_id,
      customerName: dbOrder.customer_name,
      customerPhone: dbOrder.customer_phone,
      deliveryAddress: dbOrder.delivery_address,
      quantity: dbOrder.quantity,
      totalAmount: dbOrder.total_amount,
      status: dbOrder.status,
      orderDate: new Date(dbOrder.created_at).toISOString(),
      createdAt: new Date(dbOrder.created_at).toISOString(),
      updatedAt: new Date(dbOrder.updated_at).toISOString()
    };
  }

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    // Transform frontend format to database format
    const dbOrderData = {
      shop_id: orderData.shopId,
      product_id: orderData.productId,
      customer_id: orderData.customerId,
      customer_name: orderData.customerName,
      customer_phone: orderData.customerPhone,
      delivery_address: orderData.deliveryAddress,
      quantity: orderData.quantity,
      total_amount: orderData.totalAmount,
      status: orderData.status || 'pending'
    };

    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbOrderData)
    });
    if (!response.ok) throw new Error('Failed to create order');
    const dbOrder = await response.json();
    
    // Transform back to frontend format
    return {
      id: dbOrder.id,
      shopId: dbOrder.shop_id,
      productId: dbOrder.product_id,
      customerId: dbOrder.customer_id,
      customerName: dbOrder.customer_name,
      customerPhone: dbOrder.customer_phone,
      deliveryAddress: dbOrder.delivery_address,
      quantity: dbOrder.quantity,
      totalAmount: dbOrder.total_amount,
      status: dbOrder.status,
      orderDate: new Date(dbOrder.created_at).toISOString(),
      createdAt: new Date(dbOrder.created_at).toISOString(),
      updatedAt: new Date(dbOrder.updated_at).toISOString()
    };
  }

  async updateOrder(id: string, orderData: Partial<Order>): Promise<Order> {
    // Transform frontend format to database format
    const dbUpdateData: any = {};
    if (orderData.status) dbUpdateData.status = orderData.status;
    if (orderData.customerName) dbUpdateData.customer_name = orderData.customerName;
    if (orderData.customerPhone) dbUpdateData.customer_phone = orderData.customerPhone;
    if (orderData.deliveryAddress) dbUpdateData.delivery_address = orderData.deliveryAddress;
    if (orderData.quantity) dbUpdateData.quantity = orderData.quantity;
    if (orderData.totalAmount) dbUpdateData.total_amount = orderData.totalAmount;

    const response = await fetch(`${this.baseUrl}/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbUpdateData)
    });
    if (!response.ok) throw new Error('Failed to update order');
    const dbOrder = await response.json();
    
    // Transform back to frontend format
    return {
      id: dbOrder.id,
      shopId: dbOrder.shop_id,
      productId: dbOrder.product_id,
      customerId: dbOrder.customer_id,
      customerName: dbOrder.customer_name,
      customerPhone: dbOrder.customer_phone,
      deliveryAddress: dbOrder.delivery_address,
      quantity: dbOrder.quantity,
      totalAmount: dbOrder.total_amount,
      status: dbOrder.status,
      orderDate: new Date(dbOrder.created_at).toISOString(),
      createdAt: new Date(dbOrder.created_at).toISOString(),
      updatedAt: new Date(dbOrder.updated_at).toISOString()
    };
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    return this.updateOrder(orderId, { status });
  }

  // ======= ORDER MESSAGES API =======
  
  async getOrderMessages(orderId: string): Promise<OrderMessage[]> {
    const response = await fetch(`${this.baseUrl}/orders/${orderId}/messages`);
    if (!response.ok) throw new Error('Failed to fetch messages');
    const dbMessages = await response.json();
    
    // Transform database format to frontend format
    return dbMessages.map((dbMessage: any) => ({
      id: dbMessage.id,
      orderId: dbMessage.order_id,
      senderId: dbMessage.sender_id,
      senderType: dbMessage.sender_type,
      message: dbMessage.message,
      timestamp: new Date(dbMessage.created_at).toISOString()
    }));
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
    
    // Transform back to frontend format
    return {
      id: dbMessage.id,
      orderId: dbMessage.order_id,
      senderId: dbMessage.sender_id,
      senderType: dbMessage.sender_type,
      message: dbMessage.message,
      timestamp: new Date(dbMessage.created_at).toISOString()
    };
  }

  // ======= LEGACY METHODS (for compatibility) =======
  
  async getReservations() {
    // For now, return empty array since reservations are legacy
    return [];
  }

  // Legacy method names for backward compatibility
  async getShopsByStatus(status: string) {
    const shops = await this.getShops();
    return shops.filter(shop => shop.status === status);
  }
}

export const dataService = new DataService();