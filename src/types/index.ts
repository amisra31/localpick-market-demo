
export interface Shop {
  id: string;
  name: string;
  category: 'Food' | 'Gifts' | 'Souvenirs' | 'Other';
  location: string;
  hours: string;
  ownerId: string;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  image: string;
  price: number;
  description: string;
  stock: number;
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
