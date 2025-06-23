
export interface DayHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export type ShopStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export interface Shop {
  id: string;
  name: string;
  category: 'Food' | 'Gifts' | 'Souvenirs' | 'Other';
  location: string;
  phone: string;
  hours: string; // Keep for backward compatibility
  operatingHours?: OperatingHours;
  ownerId: string;
  businessEmail?: string;
  website?: string;
  socialLinks?: string;
  shopPhoto?: string;
  aboutShop?: string;
  status?: ShopStatus;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  image: string;
  price: number;
  description: string;
  stock: number;
  isArchived?: boolean;
  archivedAt?: string;
}

export interface Reservation {
  id: string;
  productId: string;
  shopId: string;
  customerName: string;
  email?: string;
  timestamp: string;
}

export interface ShopOwner {
  id: string;
  name: string;
  email: string;
}

export interface ProductWithShop extends Product {
  shop: Shop;
}

export interface ReservationWithDetails extends Reservation {
  product: Product;
  shop: Shop;
}

export type OrderStatus = 'pending' | 'reserved' | 'in_progress' | 'delivered' | 'cancelled';
export type OrderType = 'order' | 'reservation';

export interface Order {
  id: string;
  shopId: string;
  productId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  quantity: number;
  totalAmount: number;
  status: OrderStatus;
  orderType?: OrderType;
  orderDate: string;
  createdAt: string;
  updatedAt: string;
  messages?: OrderMessage[];
}

export interface OrderMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderType: 'merchant' | 'customer';
  message: string;
  timestamp: string;
}

export interface DirectMessage {
  id: string;
  customer_id: string;
  shop_id: string;
  product_id?: string;
  sender_id: string;
  sender_type: 'merchant' | 'customer';
  message: string;
  is_read: boolean;
  created_at: number;
}

export interface OrderWithDetails extends Order {
  product: Product;
  shop: Shop;
}
