export type ProductStatus = 'healthy' | 'low_stock' | 'expiring_soon' | 'expired';

export interface CateringProduct {
  id: string;
  name: string;
  nameAr?: string;
  category: string;
  categoryAr?: string;
  barcode?: string;
  reorderLevel?: number;
  image?: string;
  imageFile?: File;
  icon?: string;
  sellingPrice: number;
  costPrice: number;
  stock: number;
  expirationDate?: string;
  isExpired?: boolean;
  status: ProductStatus;
  marginPercent?: number;
  soldCount?: number;
  totalRevenue?: number;
}

export interface TopSellingProduct {
  rank: number;
  name: string;
  nameAr?: string;
  category: string;
  categoryAr?: string;
  icon: string;
  qty: number;
  revenue: number;
}

export interface CategoryRevenue {
  category: string;
  categoryAr: string;
  amount: number;
  maxAmount: number;
  percentage: number;
}

export interface PaymentBreakdown {
  cardPercent: number;
  appPercent: number;
  cashPercent: number;
  totalTxns: number;
}

export interface PosCartItem {
  product: CateringProduct;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PosSalePayload {
  items: PosCartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'app';
}
