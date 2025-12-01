// Enum-like constants
export const Role = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
  DELIVERY_PARTNER: 'DELIVERY_PARTNER',
} as const;

export const OrderStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export const SubscriptionFrequency = {
  WEEKLY: 'WEEKLY',
  BIWEEKLY: 'BIWEEKLY',
  MONTHLY: 'MONTHLY',
} as const;

export const SubscriptionPreference = {
  MIXED: 'MIXED',
  SEASONAL: 'SEASONAL',
  CUSTOM: 'CUSTOM',
} as const;

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  CANCELLED: 'CANCELLED',
} as const;

export const ReviewStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export const ProductCategory = {
  FRESH: 'fresh',
  SEASONAL: 'seasonal',
  ORGANIC: 'organic',
  EXOTIC: 'exotic',
} as const;

// Recommendation reason tags
export const RecommendationReason = {
  FREQUENTLY_BOUGHT_TOGETHER: 'frequently_bought_together',
  TRENDING: 'trending',
  BASED_ON_HISTORY: 'based_on_history',
  FREQUENTLY_REORDERED: 'frequently_reordered',
  SAME_CATEGORY: 'same_category',
} as const;

export const BulkOrderStatus = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  INVOICE_GENERATED: 'INVOICE_GENERATED',
} as const;

// Loyalty Types
export const LoyaltyTier = {
  BASIC: 'BASIC',
  SILVER: 'SILVER',
  GOLD: 'GOLD',
} as const;

export const LoyaltyTransactionType = {
  EARN: 'EARN',
  REDEEM: 'REDEEM',
} as const;

export const RefundStatus = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export const RefundMethod = {
  ONLINE: 'ONLINE',
  COD: 'COD',
} as const;

export const PaymentMethod = {
  ONLINE: 'ONLINE',
  COD: 'COD',
} as const;

// Type exports
export type RoleType = (typeof Role)[keyof typeof Role];
export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];
export type PaymentStatusType = (typeof PaymentStatus)[keyof typeof PaymentStatus];
export type SubscriptionFrequencyType = (typeof SubscriptionFrequency)[keyof typeof SubscriptionFrequency];
export type SubscriptionPreferenceType = (typeof SubscriptionPreference)[keyof typeof SubscriptionPreference];
export type SubscriptionStatusType = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
export type ReviewStatusType = (typeof ReviewStatus)[keyof typeof ReviewStatus];
export type ProductCategoryType = (typeof ProductCategory)[keyof typeof ProductCategory];
export type RecommendationReasonType = (typeof RecommendationReason)[keyof typeof RecommendationReason];
export type BulkOrderStatusType = (typeof BulkOrderStatus)[keyof typeof BulkOrderStatus];
export type LoyaltyTierType = (typeof LoyaltyTier)[keyof typeof LoyaltyTier];
export type LoyaltyTransactionTypeType = (typeof LoyaltyTransactionType)[keyof typeof LoyaltyTransactionType];
export type RefundStatusType = (typeof RefundStatus)[keyof typeof RefundStatus];
export type RefundMethodType = (typeof RefundMethod)[keyof typeof RefundMethod];
export type PaymentMethodType = (typeof PaymentMethod)[keyof typeof PaymentMethod];

// Razorpay Types
export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

// Product Types
export interface ProductWithStock {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  isAvailable: boolean;
  isSeasonal: boolean;
}

// Recommendation Types
export interface RecommendedProduct extends ProductWithStock {
  reasonTag: RecommendationReasonType;
}

// Cart Types
export interface CartItem {
  product: ProductWithStock;
  quantity: number;
}

// Order Types
export interface OrderWithItems {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: Date;
  items: {
    id: string;
    quantity: number;
    price: number;
    product: ProductWithStock;
  }[];
  address: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    pincode: string;
  };
}

// Subscription Types
export interface SubscriptionWithItems {
  id: string;
  subscriptionNumber: string;
  frequency: string;
  preference: string;
  quantity: number;
  totalAmount: number;
  status: string;
  startDate: Date;
  nextDeliveryDate: Date;
  pausedUntil?: Date | null;
  items: {
    id: string;
    quantity: number;
    product: ProductWithStock;
  }[];
  address: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    pincode: string;
  };
}

// Analytics Types
export interface DashboardAnalytics {
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  ordersThisMonth: number;
  totalCustomers: number;
  revenueThisMonth: number;
  lowStockProducts: number;
  recentOrders: OrderWithItems[];
  topProducts: {
    product: ProductWithStock;
    totalSold: number;
  }[];
}

// Form Types
export interface CheckoutFormData {
  addressId: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
}

export interface SubscriptionFormData {
  frequency: SubscriptionFrequencyType;
  preference: SubscriptionPreferenceType;
  addressId: string;
  items: {
    productId: string;
    quantity: number;
  }[];
}

export interface AddressFormData {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  image: string;
  category: ProductCategoryType;
  stock: number;
  isAvailable: boolean;
  isSeasonal: boolean;
}

// Loyalty Types
export interface LoyaltyTransaction {
  id: string;
  userId: string;
  orderId: string | null;
  type: LoyaltyTransactionTypeType;
  points: number;
  description: string;
  createdAt: Date;
  order?: {
    orderNumber: string;
  } | null;
}

export interface LoyaltyInfo {
  pointsBalance: number;
  loyaltyTier: LoyaltyTierType;
  transactions: LoyaltyTransaction[];
}

export interface LoyaltySettings {
  pointsPerRupee: number;
  minRedeemablePoints: number;
  pointValueInRupees: number;
  silverTierThreshold: number;
  goldTierThreshold: number;
}

// Review Types
export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title?: string | null;
  comment: string;
  verifiedPurchase: boolean;
  status: ReviewStatusType;
  createdAt: Date | string;
  updatedAt: Date | string;
  user?: {
    id: string;
    name?: string | null;
  };
  product?: {
    id: string;
    name: string;
    image: string;
  };
}

export interface ReviewFormData {
  rating: number;
  title?: string;
  comment: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}
