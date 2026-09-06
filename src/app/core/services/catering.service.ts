import { Injectable, signal, computed, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { CateringProduct, TopSellingProduct, CategoryRevenue, PaymentBreakdown } from '../models/catering.model';
import { ProductApiService, BackendProductDto } from './api/product-api.service';
import { AuthService } from './auth.service';

export const INITIAL_PRODUCTS: CateringProduct[] = [];
export const DEFAULT_CATEGORIES: { value: string; labelEn: string; labelAr: string }[] = [
  { value: 'Snacks', labelEn: 'Snacks', labelAr: 'سناكس ومخبوزات' },
  { value: 'Beverages', labelEn: 'Beverages', labelAr: 'مشروبات وعصائر' },
  { value: 'Coffee', labelEn: 'Coffee', labelAr: 'قهوة وهوت درينكس' },
  { value: 'Meals', labelEn: 'Meals', labelAr: 'وجبات وسندوتشات' },
  { value: 'Merchandise', labelEn: 'Merchandise', labelAr: 'ميرش ومنتجات NOOK' }
];

function getLocalCache<T>(key: string, fallback: T): T {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = localStorage.getItem(key);
      if (item) return JSON.parse(item);
    }
  } catch {}
  return fallback;
}

function setLocalCache<T>(key: string, val: T): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(val));
    }
  } catch {}
}

function base64ToFile(dataUrl: string, filename: string): File | null {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:')) return null;
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch {
    return null;
  }
}

@Injectable({
  providedIn: 'root'
})
export class CateringService {
  public static readonly STORAGE_KEY = 'nook_catering_products_cache';
  public static readonly TOMBSTONE_KEY = 'nook_deleted_products';

  private productApi = inject(ProductApiService);
  private authService = inject(AuthService);

  readonly products = signal<CateringProduct[]>(this.loadInitialProducts());
  readonly categories = signal<{ value: string; labelEn: string; labelAr: string }[]>([...DEFAULT_CATEGORIES]);

  // Dynamic Top Selling Products based on current products array
  readonly topProducts = computed<TopSellingProduct[]>(() => {
    const list = [...this.products()];
    list.sort((a, b) => {
      const bRev = b.totalRevenue ?? ((b.soldCount ?? 0) * b.sellingPrice);
      const aRev = a.totalRevenue ?? ((a.soldCount ?? 0) * a.sellingPrice);
      return bRev - aRev;
    });
    return list.slice(0, 4).map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      nameAr: p.nameAr || p.name,
      category: p.category,
      categoryAr: p.categoryAr || p.category,
      icon: p.icon || 'coffee',
      qty: p.soldCount ?? 1,
      revenue: p.totalRevenue ?? ((p.soldCount ?? 0) * p.sellingPrice)
    }));
  });

  // Dynamic Category Revenue Breakdown based on current products
  readonly categoryRevenue = computed<CategoryRevenue[]>(() => {
    const list = this.products();
    const map = new Map<string, { amount: number; nameAr: string }>();

    for (const p of list) {
      const cat = p.category || 'Misc';
      const catAr = p.categoryAr || 'أخرى';
      const rev = p.totalRevenue ?? ((p.soldCount ?? 0) * p.sellingPrice);
      const existing = map.get(cat) || { amount: 0, nameAr: catAr };
      existing.amount += rev;
      map.set(cat, existing);
    }

    let maxVal = 100;
    map.forEach(val => {
      if (val.amount > maxVal) maxVal = val.amount;
    });

    const result: CategoryRevenue[] = [];
    map.forEach((val, cat) => {
      result.push({
        category: cat,
        categoryAr: val.nameAr,
        amount: Math.round(val.amount),
        maxAmount: Math.ceil(maxVal * 1.1),
        percentage: Math.min(100, Math.round((val.amount / maxVal) * 100))
      });
    });

    return result.slice(0, 5);
  });

  // Dynamic Total Revenue
  readonly totalRevenue = computed(() => {
    return this.products().reduce((sum, p) => sum + (p.totalRevenue ?? ((p.soldCount ?? 0) * p.sellingPrice)), 0);
  });

  // Payment Breakdown
  readonly paymentBreakdown = signal<PaymentBreakdown>({
    cardPercent: 0,
    appPercent: 0,
    cashPercent: 0,
    totalTxns: 0
  });

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.syncWithBackend();
    }
  }

  private loadInitialProducts(): CateringProduct[] {
    const deletedIds = getLocalCache<string[]>(CateringService.TOMBSTONE_KEY, []);
    const cached = getLocalCache<CateringProduct[]>(CateringService.STORAGE_KEY, []);
    return (cached || []).filter(p => !deletedIds.includes(p.id));
  }

  /** Fetch live products from backend */
  syncWithBackend(): void {
    if (!this.authService.isAuthenticated()) return;
    this.productApi.getProducts().pipe(
      catchError((err) => {
        console.warn('[CateringService] Could not fetch products from API, retaining cached data:', err?.message || err);
        return of([] as BackendProductDto[]);
      })
    ).subscribe({
      next: (apiProducts) => {
        const deletedIds = getLocalCache<string[]>(CateringService.TOMBSTONE_KEY, []);
        if (apiProducts && apiProducts.length > 0) {
          const validList = apiProducts.filter(p => !deletedIds.includes(p.id));
          const mapped = validList.map(p => this.mapDtoToProduct(p));
          this.products.set(mapped);
          setLocalCache(CateringService.STORAGE_KEY, mapped);
        }
      }
    });
  }

  private mapDtoToProduct(dto: BackendProductDto): CateringProduct {
    const margin = dto.piecePrice > 0
      ? Math.round(((dto.piecePrice - dto.cost) / dto.piecePrice) * 100)
      : 0;

    return {
      id: dto.id,
      name: dto.name,
      nameAr: dto.name,
      category: 'Snacks',
      categoryAr: 'سناكس ومخبوزات',
      sellingPrice: dto.piecePrice,
      costPrice: dto.cost,
      stock: dto.quantity,
      reorderLevel: 10,
      soldCount: 0,
      totalRevenue: 0,
      status: dto.quantity <= 10 ? (dto.quantity === 0 ? 'expired' : 'low_stock') : 'healthy',
      marginPercent: margin,
      barcode: dto.serialNo || '',
      image: dto.imageUrl || '',
      expirationDate: dto.expireDate ? String(dto.expireDate).split('T')[0] : undefined
    };
  }

  addCategory(name: string, nameAr?: string): { value: string; labelEn: string; labelAr: string } {
    const trimmed = name.trim();
    const existing = this.categories().find(c => c.value.toLowerCase() === trimmed.toLowerCase() || c.labelAr === trimmed);
    if (existing) return existing;

    const newCat = {
      value: trimmed,
      labelEn: trimmed,
      labelAr: (nameAr || trimmed).trim()
    };

    this.categories.update(list => [...list, newCat]);
    return newCat;
  }

  addProduct(newProduct: CateringProduct): void {
    const margin = newProduct.sellingPrice > 0
      ? Math.round(((newProduct.sellingPrice - newProduct.costPrice) / newProduct.sellingPrice) * 100)
      : 0;

    const reorder = newProduct.reorderLevel !== undefined ? newProduct.reorderLevel : 10;
    let status: CateringProduct['status'] = 'healthy';
    if (newProduct.stock <= reorder && newProduct.stock > 0) {
      status = 'low_stock';
    } else if (newProduct.isExpired || newProduct.stock === 0) {
      status = newProduct.isExpired ? 'expired' : 'low_stock';
    }

    const item: CateringProduct = {
      ...newProduct,
      reorderLevel: reorder,
      barcode: newProduct.barcode || `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      marginPercent: margin,
      status: status,
      totalRevenue: (newProduct.soldCount || 0) * newProduct.sellingPrice
    };

    // 1. Immediately update UI & persist to Local Storage
    this.products.update(list => {
      const next = [item, ...list];
      setLocalCache(CateringService.STORAGE_KEY, next);
      return next;
    });

    // 2. Prepare payload for Backend API
    let expireDateIso: string | undefined = undefined;
    if (newProduct.expirationDate && newProduct.expirationDate !== 'N/A' && newProduct.expirationDate.trim() !== '') {
      const d = new Date(newProduct.expirationDate);
      if (!isNaN(d.getTime())) {
        expireDateIso = d.toISOString();
      }
    }

    // Determine if file upload is required
    const file = newProduct.imageFile || (newProduct.image ? base64ToFile(newProduct.image, 'product.png') : null);

    if (file) {
      const formData = new FormData();
      formData.append('Name', newProduct.name);
      formData.append('PiecePrice', String(newProduct.sellingPrice));
      formData.append('Cost', String(newProduct.costPrice));
      formData.append('Quantity', String(newProduct.stock));
      if (newProduct.barcode) formData.append('SerialNo', newProduct.barcode);
      if (expireDateIso) formData.append('ExpireDate', expireDateIso);
      formData.append('imageFile', file);

      this.productApi.createProduct(formData).subscribe({
        next: (res) => {
          if (res && res.id) {
            this.products.update(list => {
              const updated = list.map(p => p.id === item.id ? { ...p, id: res.id, image: res.imageUrl || p.image } : p);
              setLocalCache(CateringService.STORAGE_KEY, updated);
              return updated;
            });
          }
        },
        error: (err) => console.warn('[CateringService] Create product API notice (FormData):', err?.message)
      });
    } else {
      const plainPayload = {
        Name: newProduct.name,
        PiecePrice: newProduct.sellingPrice,
        Cost: newProduct.costPrice,
        Quantity: newProduct.stock,
        SerialNo: newProduct.barcode || undefined,
        ImageUrl: newProduct.image && !newProduct.image.startsWith('data:') ? newProduct.image : undefined,
        ExpireDate: expireDateIso
      };

      this.productApi.createProduct(plainPayload).subscribe({
        next: (res) => {
          if (res && res.id) {
            this.products.update(list => {
              const updated = list.map(p => p.id === item.id ? { ...p, id: res.id, image: res.imageUrl || p.image } : p);
              setLocalCache(CateringService.STORAGE_KEY, updated);
              return updated;
            });
          }
        },
        error: (err) => console.warn('[CateringService] Create product API notice (JSON):', err?.message)
      });
    }
  }

  processPosSale(sale: { items: { product: CateringProduct; quantity: number; unitPrice: number; totalPrice: number }[]; paymentMethod: 'cash' | 'card' | 'app'; total: number }): void {
    this.products.update(list => {
      const next = list.map(prod => {
        const found = sale.items.find(i => i.product.id === prod.id);
        if (!found) return prod;

        const newStock = Math.max(0, prod.stock - found.quantity);
        const newSoldCount = (prod.soldCount || 0) + found.quantity;
        const newTotalRevenue = (prod.totalRevenue || 0) + found.totalPrice;
        const reorder = prod.reorderLevel !== undefined ? prod.reorderLevel : 10;

        let status: CateringProduct['status'] = prod.status;
        if (newStock === 0) {
          status = 'low_stock';
        } else if (newStock <= reorder) {
          status = 'low_stock';
        }

        return {
          ...prod,
          stock: newStock,
          soldCount: newSoldCount,
          totalRevenue: newTotalRevenue,
          status
        };
      });
      setLocalCache(CateringService.STORAGE_KEY, next);
      return next;
    });

    this.paymentBreakdown.update(pb => ({
      ...pb,
      totalTxns: pb.totalTxns + 1
    }));
  }

  updateProduct(updated: CateringProduct): void {
    this.products.update(list => {
      const next = list.map(p => (p.id === updated.id ? updated : p));
      setLocalCache(CateringService.STORAGE_KEY, next);
      return next;
    });

    const file = updated.imageFile || (updated.image ? base64ToFile(updated.image, 'product.png') : null);

    if (file) {
      const formData = new FormData();
      formData.append('Name', updated.name);
      formData.append('PiecePrice', String(updated.sellingPrice));
      formData.append('Cost', String(updated.costPrice));
      formData.append('Quantity', String(updated.stock));
      if (updated.barcode) formData.append('SerialNo', updated.barcode);
      formData.append('imageFile', file);

      this.productApi.updateProduct(updated.id, formData).subscribe({
        error: (err) => console.warn('[CateringService] Update product API notice (FormData):', err?.message)
      });
    } else {
      this.productApi.updateProduct(updated.id, {
        Name: updated.name,
        PiecePrice: updated.sellingPrice,
        Cost: updated.costPrice,
        Quantity: updated.stock,
        SerialNo: updated.barcode || undefined,
        ImageUrl: updated.image && !updated.image.startsWith('data:') ? updated.image : undefined
      }).subscribe({
        error: (err) => console.warn('[CateringService] Update product API notice (JSON):', err?.message)
      });
    }
  }

  deleteProduct(id: string): void {
    // 1. Tombstone tracking
    const deletedIds = getLocalCache<string[]>(CateringService.TOMBSTONE_KEY, []);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      setLocalCache(CateringService.TOMBSTONE_KEY, deletedIds);
    }

    // 2. Remove from local signal and local storage
    this.products.update(list => {
      const next = list.filter(p => p.id !== id);
      setLocalCache(CateringService.STORAGE_KEY, next);
      return next;
    });

    // 3. API Delete Call
    this.productApi.deleteProduct(id).subscribe({
      error: (err) => console.warn('[CateringService] Delete product API notice:', err?.message)
    });
  }
}