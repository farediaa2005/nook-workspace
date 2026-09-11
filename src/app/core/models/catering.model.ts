/**
 * Catering & Products Domain Models and DTOs
 * Following Angular Clean Architecture Layer 1: [1. Model / DTO]
 */

// ==========================================
// 1️⃣ Backend DTOs (Data Transfer Objects from /api/Products)
// ==========================================

export interface ProductDto {
  id: string;
  name: string;
  imageUrl?: string | null;
  serialNo?: string | null;
  piecePrice: number;
  quantity: number;
  cost: number;
  restockDate?: string | null;
  expireDate?: string | null;
}

export interface CreateProductDto {
  Name: string;
  name?: string;
  ImageUrl?: string;
  imageUrl?: string;
  SerialNo?: string;
  serialNo?: string;
  PiecePrice: number;
  piecePrice?: number;
  Quantity: number;
  quantity?: number;
  Cost: number;
  cost?: number;
  RestockDate?: string;
  restockDate?: string;
  ExpireDate?: string;
  expireDate?: string;
}

export interface UpdateProductDto {
  Name?: string;
  name?: string;
  ImageUrl?: string;
  imageUrl?: string;
  SerialNo?: string;
  serialNo?: string;
  PiecePrice?: number;
  piecePrice?: number;
  Quantity?: number;
  quantity?: number;
  Cost?: number;
  cost?: number;
  RestockDate?: string;
  restockDate?: string;
  ExpireDate?: string;
  expireDate?: string;
}

// Backward compatibility alias
export type BackendProductDto = ProductDto;
export type CreateProductPayload = CreateProductDto;
export type UpdateProductPayload = UpdateProductDto;

// ==========================================
// 2️⃣ Frontend Domain Models (UI State)
// ==========================================

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
  localPreview?: string;
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
