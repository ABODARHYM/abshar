export type UserRole =
  | 'customer' | 'store_owner' | 'driver' | 'admin'
  | 'support' | 'finance' | 'dispatcher' | 'super_admin';

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  status: string;
  roles: UserRole[];
  permissions: string[];
}

export interface AuthResponse {
  user: User;
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
}

export interface City {
  id: string; countryCode: string; nameAr: string; nameEn: string;
  slug: string; latitude: number; longitude: number; timezone: string;
}

export interface Store {
  id: string; nameAr: string; nameEn: string | null;
  descriptionAr: string | null; logoUrl: string | null; coverUrl: string | null;
  rating: number; ratingCount: number; deliveryFee: number; minOrder: number;
  avgPrepTime: number; isOpen: boolean; categoryId: string | null;
  cityId: string | null; areaId: string | null;
  latitude: number | null; longitude: number | null;
}

export interface Product {
  id: string; storeId: string; categoryId: string | null;
  nameAr: string; nameEn: string | null; descriptionAr: string | null;
  imageUrl: string | null; price: number; discountPrice: number | null;
  isAvailable: boolean; stock: number | null;
}

export interface CartItem {
  productId: string; nameAr: string; price: number; quantity: number;
  imageUrl: string | null; storeId: string; storeName: string;
}

export type OrderStatus =
  | 'pending' | 'accepted' | 'preparing' | 'ready'
  | 'driverAssigned' | 'pickedUp' | 'driverGoingToCustomer'
  | 'driverArrivedCustomer' | 'delivered' | 'cancelled' | 'rejected';

export interface OrderItem {
  id: string; productId: string; nameAr: string;
  price: number; quantity: number; total: number;
}

export interface Order {
  id: string; orderNumber: string; customerId: string; storeId: string;
  driverId: string | null; status: OrderStatus;
  subtotal: number; deliveryFee: number; discountAmount: number; total: number;
  paymentMethod: 'cash' | 'card' | 'wallet';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  deliveryAddress: {
    city: string; district: string; area: string;
    landmark: string | null; latitude: number | null; longitude: number | null;
  };
  items: OrderItem[]; notes: string | null;
  createdAt: string; deliveredAt: string | null;
}

export interface LoyaltyBalance {
  points: number; pendingPoints: number; pointValueCurrency: number;
  totalValue: number; currency: string;
  lifetimeEarned: number; lifetimeRedeemed: number;
}

export interface Reward {
  id: string; nameAr: string; nameEn: string; descriptionAr: string | null;
  pointsCost: number;
  rewardType: 'discount_fixed' | 'discount_percent' | 'free_delivery' | 'product';
  rewardValue: number; imageUrl: string | null;
  stock: number | null; usedCount: number; isActive: boolean;
}

export interface ReferralCode {
  referralCode: string; shareUrl: string;
  rewardOnSignup: number; rewardOnFirstOrder: number;
}

export interface ReferralStats {
  total: number; pending: number; completed: number;
  rewarded: number; totalPointsEarned: number;
}

export interface AppNotification {
  id: string; type: string; title: string; body: string;
  category: string | null; priority: string | null;
  actionUrl: string | null; icon: string | null;
  isRead: boolean; readAt: string | null; createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ApiError {
  code: string; message: string; details: any; requestId?: string;
}
