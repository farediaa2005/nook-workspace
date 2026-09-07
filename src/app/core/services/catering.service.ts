import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, catchError, of, map, tap, switchMap } from 'rxjs';
import {
  ProductDto,
  CreateProductDto,
  UpdateProductDto,
  CateringProduct,
  TopSellingProduct,
  CategoryRevenue,
  PaymentBreakdown,
  ProductStatus
} from '../models/catering.model';
import { ProductApiService } from './api/product-api.service';
import { AuthService } from './auth.service';
import { parseIsoToLocalDate, parseIsoToLocalDateObj } from '../utils/date-time.util';
import { resolveImageUrl, getProductImageCache, setProductImageCache } from '../utils/image-url.util';

export const DEFAULT_CATEGORIES: { value: string; labelEn: string; labelAr: string }[] = [
  { value: 'Snacks', labelEn: 'Snacks', labelAr: 'سناكس ومخبوزات' },
  { value: 'Beverages', labelEn: 'Beverages', labelAr: 'مشروبات وعصائر' },
  { value: 'Coffee', labelEn: 'Coffee', labelAr: 'قهوة وهوت درينكس' },
  { value: 'Meals', labelEn: 'Meals', labelAr: 'وجبات وسندوتشات' },
  { value: 'Merchandise', labelEn: 'Merchandise', labelAr: 'ميرش ومنتجات NOOK' }
];

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

export interface CreateProductInput {
  name: string;
  nameAr?: string;
  category?: string;
  categoryAr?: string;
  sellingPrice: number;
  costPrice: number;
  stock: number;
  barcode?: string;
  expirationDate?: string;
  reorderLevel?: number;
  imageFile?: File | null;
  image?: string | null;
}

/**
 * 4️⃣ Catering Feature Service (Layer 4: [4. Feature Service])
 * The "Brain" of the Catering feature:
 * - Injects ProductApiService (Layer 3)
 * - Maps raw ProductDto to UI CateringProduct model (Data Mapping)
 * - Manages Angular Signals state for UI reactivity
 * - Provides clean business methods (getProducts, createProduct, updateProduct, deleteProduct)
 */
@Injectable({
  providedIn: 'root'
})
export class CateringService {
  private productApi = inject(ProductApiService);
  private authService = inject(AuthService);

  // Private State Signals
  private productsState = signal<CateringProduct[]>([]);
  private isLoadingState = signal<boolean>(false);
  private errorMessageState = signal<string | null>(null);

  // Public Readonly Signals
  readonly products = this.productsState.asReadonly();
  readonly isLoading = this.isLoadingState.asReadonly();
  readonly errorMessage = this.errorMessageState.asReadonly();

  readonly categories = signal<{ value: string; labelEn: string; labelAr: string }[]>([...DEFAULT_CATEGORIES]);

  // Dynamic Top Selling Products based on actual sales
  readonly topProducts = computed<TopSellingProduct[]>(() => {
    const list = this.productsState().filter(p => (p.soldCount || 0) > 0 || (p.totalRevenue || 0) > 0);
    if (list.length === 0) return [];

    list.sort((a, b) => {
      const bRev = b.totalRevenue ?? ((b.soldCount ?? 0) * b.sellingPrice);
      const aRev = a.totalRevenue ?? ((a.soldCount ?? 0) * a.sellingPrice);
      return bRev - aRev;
    });

    return list.slice(0, 5).map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      nameAr: p.nameAr || p.name,
      category: p.category,
      categoryAr: p.categoryAr || p.category,
      icon: p.icon || 'coffee',
      qty: p.soldCount ?? 0,
      revenue: p.totalRevenue ?? ((p.soldCount ?? 0) * p.sellingPrice)
    }));
  });

  // Dynamic Category Revenue Breakdown based on actual product revenue
  readonly categoryRevenue = computed<CategoryRevenue[]>(() => {
    const list = this.productsState().filter(p => (p.totalRevenue ?? ((p.soldCount ?? 0) * p.sellingPrice)) > 0);
    if (list.length === 0) return [];

    const map = new Map<string, { amount: number; nameAr: string }>();

    for (const p of list) {
      const cat = p.category || 'Snacks';
      const catAr = p.categoryAr || 'سناكس ومخبوزات';
      const rev = p.totalRevenue ?? ((p.soldCount ?? 0) * p.sellingPrice);
      const existing = map.get(cat) || { amount: 0, nameAr: catAr };
      existing.amount += rev;
      map.set(cat, existing);
    }

    let maxVal = 0;
    map.forEach(val => {
      if (val.amount > maxVal) maxVal = val.amount;
    });

    if (maxVal === 0) return [];

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

    return result;
  });

  // Dynamic Total Revenue
  readonly totalRevenue = computed(() => {
    return this.productsState().reduce((sum, p) => sum + (p.totalRevenue ?? ((p.soldCount ?? 0) * p.sellingPrice)), 0);
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
      this.getProducts().subscribe();
    }
  }

  /**
   * Get products from backend API (GET /api/Products).
   * Maps ProductDto[] -> CateringProduct[] and updates state.
   */
  getProducts(): Observable<CateringProduct[]> {
    if (!this.authService.isAuthenticated()) {
      return of([]);
    }

    this.isLoadingState.set(true);
    this.errorMessageState.set(null);

    return this.productApi.getProducts().pipe(
      map(dtoList => {
        const mapped = (dtoList || []).map(dto => this.mapDtoToProduct(dto));
        this.productsState.set(mapped);
        this.isLoadingState.set(false);
        return mapped;
      }),
      catchError((err) => {
        this.isLoadingState.set(false);
        const msg = err?.error?.message || err?.message || 'Failed to sync products from server';
        this.errorMessageState.set(msg);
        console.warn('[CateringService] Could not fetch products from API:', msg);
        return of([] as CateringProduct[]);
      })
    );
  }

  /** Alias for backward compatibility */
  syncWithBackend(): Observable<CateringProduct[]> {
    return this.getProducts();
  }

  /**
   * Data Mapping: transforms backend ProductDto into frontend CateringProduct
   */
  private mapDtoToProduct(dto: ProductDto): CateringProduct {
    const margin = dto.piecePrice > 0
      ? Math.round(((dto.piecePrice - dto.cost) / dto.piecePrice) * 100)
      : 0;

    let isExpired = false;
    let expDateStr: string | undefined = undefined;
    if (dto.expireDate) {
      expDateStr = parseIsoToLocalDate(dto.expireDate);
      const parsed = parseIsoToLocalDateObj(dto.expireDate);
      if (!isNaN(parsed.getTime()) && parsed.getTime() < Date.now()) {
        isExpired = true;
      }
    }

    let status: ProductStatus = 'healthy';
    if (isExpired) {
      status = 'expired';
    } else if (dto.quantity === 0) {
      status = 'low_stock';
    } else if (dto.quantity <= 10) {
      status = 'low_stock';
    }

    let resolvedImage = resolveImageUrl(dto.imageUrl);
    if ((!resolvedImage || resolvedImage.trim() === '') && dto.id) {
      resolvedImage = getProductImageCache(dto.id) || '';
    }

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
      status: status,
      marginPercent: margin,
      barcode: dto.serialNo || '',
      image: resolvedImage,
      expirationDate: expDateStr,
      isExpired: isExpired
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

  /**
   * Create product (POST /api/Products).
   * Maps input to CreateProductDto/FormData, calls Layer 3 API, and maps returned ProductDto.
   */
  createProduct(input: CreateProductInput): Observable<CateringProduct> {
    const nameVal = (input.name || '').trim();
    let expireDateIso: string | undefined = undefined;
    if (input.expirationDate && input.expirationDate !== 'N/A' && input.expirationDate.trim() !== '') {
      const d = new Date(input.expirationDate);
      if (!isNaN(d.getTime())) {
        expireDateIso = d.toISOString();
      }
    }

    const file = input.imageFile || (input.image?.startsWith('data:') ? base64ToFile(input.image, 'product.png') : null);

    let api$: Observable<ProductDto>;
    if (file) {
      const formData = new FormData();
      formData.append('Name', nameVal);
      formData.append('name', nameVal);
      formData.append('PiecePrice', String(input.sellingPrice || 0));
      formData.append('piecePrice', String(input.sellingPrice || 0));
      formData.append('Cost', String(input.costPrice || 0));
      formData.append('cost', String(input.costPrice || 0));
      formData.append('Quantity', String(input.stock || 0));
      formData.append('quantity', String(input.stock || 0));
      if (input.barcode && input.barcode.trim()) {
        formData.append('SerialNo', input.barcode.trim());
        formData.append('serialNo', input.barcode.trim());
      }
      if (expireDateIso) {
        formData.append('ExpireDate', expireDateIso);
        formData.append('expireDate', expireDateIso);
      }
      formData.append('imageFile', file, file.name);
      formData.append('file', file, file.name);
      formData.append('image', file, file.name);
      formData.append('Image', file, file.name);

      api$ = this.productApi.createProduct(formData);
    } else {
      const plainDto: CreateProductDto = {
        Name: nameVal,
        name: nameVal,
        PiecePrice: input.sellingPrice || 0,
        piecePrice: input.sellingPrice || 0,
        Cost: input.costPrice || 0,
        cost: input.costPrice || 0,
        Quantity: input.stock || 0,
        quantity: input.stock || 0,
        SerialNo: input.barcode?.trim() || undefined,
        serialNo: input.barcode?.trim() || undefined,
        ImageUrl: input.image && !input.image.startsWith('data:') ? input.image : undefined,
        imageUrl: input.image && !input.image.startsWith('data:') ? input.image : undefined,
        ExpireDate: expireDateIso,
        expireDate: expireDateIso
      };

      api$ = this.productApi.createProduct(plainDto);
    }

    return api$.pipe(
      switchMap(resDto => {
        if (file && resDto && resDto.id) {
          return this.productApi.uploadProductImage(resDto.id, file).pipe(
            map(uploadRes => {
              if (typeof uploadRes === 'string' && uploadRes.trim()) {
                resDto.imageUrl = uploadRes;
              } else if (uploadRes && typeof uploadRes === 'object' && uploadRes.imageUrl) {
                resDto.imageUrl = uploadRes.imageUrl;
              }
              return resDto;
            }),
            catchError(() => of(resDto))
          );
        }
        return of(resDto);
      }),
      map(resDto => {
        const product = this.mapDtoToProduct(resDto);
        if (input.category) {
          product.category = input.category;
          product.categoryAr = input.categoryAr || input.category;
        }
        if (input.nameAr) product.nameAr = input.nameAr;
        if (input.reorderLevel !== undefined) product.reorderLevel = input.reorderLevel;

        // Fallback to local image if backend returned empty or unresolved image
        if (input.image && (!product.image || product.image.trim() === '')) {
          product.image = input.image;
        }

        // Cache image in localStorage for immediate and persistent display
        if (product.id && product.image) {
          setProductImageCache(product.id, product.image);
        }

        this.productsState.update(list => [product, ...list.filter(p => p.id !== product.id)]);
        return product;
      })
    );
  }

  /** Alias for backward compatibility */
  addProduct(input: CreateProductInput): Observable<CateringProduct> {
    return this.createProduct(input);
  }

  /**
   * Update product (PUT /api/Products/{id}).
   */
  updateProduct(updated: CateringProduct): Observable<CateringProduct> {
    const nameVal = (updated.name || '').trim();
    let expireDateIso: string | undefined = undefined;
    if (updated.expirationDate && updated.expirationDate !== 'N/A' && updated.expirationDate.trim() !== '') {
      const d = new Date(updated.expirationDate);
      if (!isNaN(d.getTime())) {
        expireDateIso = d.toISOString();
      }
    }

    const file = updated.imageFile || (updated.image?.startsWith('data:') ? base64ToFile(updated.image, 'product.png') : null);

    let api$: Observable<ProductDto>;
    if (file) {
      const formData = new FormData();
      formData.append('Name', nameVal);
      formData.append('name', nameVal);
      formData.append('PiecePrice', String(updated.sellingPrice || 0));
      formData.append('piecePrice', String(updated.sellingPrice || 0));
      formData.append('Cost', String(updated.costPrice || 0));
      formData.append('cost', String(updated.costPrice || 0));
      formData.append('Quantity', String(updated.stock || 0));
      formData.append('quantity', String(updated.stock || 0));
      if (updated.barcode && updated.barcode.trim()) {
        formData.append('SerialNo', updated.barcode.trim());
        formData.append('serialNo', updated.barcode.trim());
      }
      if (expireDateIso) {
        formData.append('ExpireDate', expireDateIso);
        formData.append('expireDate', expireDateIso);
      }
      formData.append('imageFile', file, file.name);
      formData.append('file', file, file.name);
      formData.append('image', file, file.name);
      formData.append('Image', file, file.name);

      api$ = this.productApi.updateProduct(updated.id, formData);
    } else {
      const plainDto: UpdateProductDto = {
        Name: nameVal,
        name: nameVal,
        PiecePrice: updated.sellingPrice || 0,
        piecePrice: updated.sellingPrice || 0,
        Cost: updated.costPrice || 0,
        cost: updated.costPrice || 0,
        Quantity: updated.stock || 0,
        quantity: updated.stock || 0,
        SerialNo: updated.barcode?.trim() || undefined,
        serialNo: updated.barcode?.trim() || undefined,
        ImageUrl: updated.image && !updated.image.startsWith('data:') ? updated.image : undefined,
        imageUrl: updated.image && !updated.image.startsWith('data:') ? updated.image : undefined,
        ExpireDate: expireDateIso,
        expireDate: expireDateIso
      };

      api$ = this.productApi.updateProduct(updated.id, plainDto);
    }

    return api$.pipe(
      switchMap(resDto => {
        if (file && resDto && resDto.id) {
          return this.productApi.uploadProductImage(resDto.id, file).pipe(
            map(uploadRes => {
              if (typeof uploadRes === 'string' && uploadRes.trim()) {
                resDto.imageUrl = uploadRes;
              } else if (uploadRes && typeof uploadRes === 'object' && uploadRes.imageUrl) {
                resDto.imageUrl = uploadRes.imageUrl;
              }
              return resDto;
            }),
            catchError(() => of(resDto))
          );
        }
        return of(resDto);
      }),
      map(resDto => {
        const product = this.mapDtoToProduct(resDto);
        product.category = updated.category;
        product.categoryAr = updated.categoryAr;
        if (updated.nameAr) product.nameAr = updated.nameAr;
        if (updated.reorderLevel !== undefined) product.reorderLevel = updated.reorderLevel;
        if (updated.image && (!product.image || product.image.trim() === '')) {
          product.image = updated.image;
        }
        if (product.id && product.image) {
          setProductImageCache(product.id, product.image);
        }
        this.productsState.update(list => list.map(p => p.id === product.id ? product : p));
        return product;
      })
    );
  }

  /**
   * Delete product (DELETE /api/Products/{id}).
   */
  deleteProduct(id: string): Observable<boolean> {
    return this.productApi.deleteProduct(id).pipe(
      tap(() => {
        this.productsState.update(list => list.filter(p => p.id !== id));
      })
    );
  }

  /**
   * Process POS sale and sync stock deduction directly with backend API.
   */
  processPosSale(sale: {
    items: { product: CateringProduct; quantity: number; unitPrice: number; totalPrice: number }[];
    paymentMethod: 'cash' | 'card' | 'app';
    total: number;
  }): void {
    // 1. Sync quantity reduction with backend for each item
    for (const item of sale.items) {
      const current = this.productsState().find(p => p.id === item.product.id);
      if (current) {
        const newStock = Math.max(0, current.stock - item.quantity);
        this.productApi.updateProduct(current.id, {
          Name: current.name,
          PiecePrice: current.sellingPrice,
          Cost: current.costPrice,
          Quantity: newStock,
          SerialNo: current.barcode || undefined
        }).subscribe({
          error: (err) => console.warn('[CateringService] Stock deduction update notice:', err?.message || err)
        });
      }
    }

    // 2. Update local signals
    this.productsState.update(list => {
      return list.map(prod => {
        const found = sale.items.find(i => i.product.id === prod.id);
        if (!found) return prod;

        const newStock = Math.max(0, prod.stock - found.quantity);
        const newSoldCount = (prod.soldCount || 0) + found.quantity;
        const newTotalRevenue = (prod.totalRevenue || 0) + found.totalPrice;
        const reorder = prod.reorderLevel !== undefined ? prod.reorderLevel : 10;

        let status: ProductStatus = prod.status;
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
    });

    // 3. Update payment breakdown statistics
    this.paymentBreakdown.update(pb => {
      const totalTxns = pb.totalTxns + 1;
      let cash = pb.cashPercent;
      let card = pb.cardPercent;
      let app = pb.appPercent;
      if (sale.paymentMethod === 'cash') cash++;
      else if (sale.paymentMethod === 'card') card++;
      else if (sale.paymentMethod === 'app') app++;

      return {
        totalTxns,
        cashPercent: totalTxns > 0 ? Math.round((cash / totalTxns) * 100) : 0,
        cardPercent: totalTxns > 0 ? Math.round((card / totalTxns) * 100) : 0,
        appPercent: totalTxns > 0 ? Math.round((app / totalTxns) * 100) : 0
      };
    });
  }
}