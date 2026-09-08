import { Injectable, signal, computed, inject, Injector } from '@angular/core';
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
import { WorkspaceService } from './workspace.service';
import { ClassroomService } from './classroom.service';
import { parseIsoToLocalDate, parseIsoToLocalDateObj } from '../utils/date-time.util';
import { resolveImageUrl, getProductImageCache, setProductImageCache } from '../utils/image-url.util';

export const DEFAULT_CATEGORIES: { value: string; labelEn: string; labelAr: string }[] = [
  { value: 'Snacks', labelEn: 'Snacks', labelAr: 'سناكس ومخبوزات' },
  { value: 'Beverages', labelEn: 'Beverages', labelAr: 'مشروبات وعصائر' },
  { value: 'Coffee', labelEn: 'Coffee', labelAr: 'قهوة وهوت درينكس' },
  { value: 'Meals', labelEn: 'Meals', labelAr: 'وجبات وسندوتشات' },
  { value: 'Merchandise', labelEn: 'Merchandise', labelAr: 'ميرش ومنتجات NOOK' }
];

export function inferCategoryFromName(name: string): { category: string; categoryAr: string } {
  if (!name) return { category: 'Snacks', categoryAr: 'سناكس ومخبوزات' };
  const lower = name.toLowerCase().trim();

  // 1. Coffee & Hot Drinks
  const coffeeKeywords = [
    'coffee', 'latte', 'cappuccino', 'espresso', 'tea', 'nescafe', 'americano',
    'mocha', 'macchiato', 'hot chocolate', 'herbal', 'anise', 'mint', 'karak',
    'sahlab', 'matcha', 'cortado', 'flat white', 'cold brew', 'v60', 'chemex', 'drip', 'turkish',
    'قهوة', 'شاي', 'لاتيه', 'كابتشينو', 'اسبريسو', 'نسكافيه', 'امريكانو', 'موكا',
    'ماكياتو', 'هوت شوكولاتة', 'نعناع', 'ينسون', 'كركديه', 'أعشاب', 'اعشاب', 'سحلب', 'كرك', 'تركية', 'فرنساوي'
  ];
  if (coffeeKeywords.some(k => lower.includes(k))) {
    return { category: 'Coffee', categoryAr: 'قهوة وهوت درينكس' };
  }

  // 2. Beverages
  const bevKeywords = [
    'water', 'pepsi', 'coke', 'coca-cola', 'sprite', '7up', 'seven up', 'juice', 'soda', 'red bull', 'redbull',
    'v7', 'schweppes', 'fanta', 'energy', 'smoothie', 'milkshake', 'ice tea', 'iced tea', 'can',
    'عصير', 'عصائر', 'مياه', 'بيبسي', 'كوكاكولا', 'سبرايت', 'سفن', 'فانتا', 'مشروب', 'شويبس', 'ريدبول', 'ريد بول', 'كانز', 'سموثي', 'ميلك شيك'
  ];
  if (bevKeywords.some(k => lower.includes(k))) {
    return { category: 'Beverages', categoryAr: 'مشروبات وعصائر' };
  }

  // 3. Meals & Sandwiches
  const mealKeywords = [
    'sandwich', 'burger', 'pizza', 'meal', 'wrap', 'toast', 'panini', 'pasta', 'salad', 'fries',
    'chicken', 'beef', 'shawarma', 'crepe', 'hotdog', 'tuna', 'omelette',
    'وجبة', 'وجبات', 'سندوتش', 'ساندوتش', 'برجر', 'بيتزا', 'توست', 'باستا', 'سلاطة', 'سلطة', 'بطاطس', 'فراخ', 'دجاج', 'لحمة', 'شاورما', 'كريب', 'تونة', 'اومليت'
  ];
  if (mealKeywords.some(k => lower.includes(k))) {
    return { category: 'Meals', categoryAr: 'وجبات وسندوتشات' };
  }

  // 4. Merchandise
  const merchKeywords = [
    'notebook', 'pen', 'sticker', 'mug', 'bottle', 't-shirt', 'hoodie', 'bag', 'book', 'nook', 'badge', 'lanyard',
    'مفكرة', 'نوت بوك', 'قلم', 'ستيكر', 'استيكر', 'مج', 'زجاجة', 'تيشيرت', 'هودي', 'حقيبة', 'شنطة', 'كتاب', 'ميرش', 'بادج', 'نوك'
  ];
  if (merchKeywords.some(k => lower.includes(k))) {
    return { category: 'Merchandise', categoryAr: 'ميرش ومنتجات NOOK' };
  }

  // 5. Snacks (Default fallback)
  return { category: 'Snacks', categoryAr: 'سناكس ومخبوزات' };
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
  private injector = inject(Injector);

  // Private State Signals
  private productsState = signal<CateringProduct[]>([]);
  private isLoadingState = signal<boolean>(false);
  private errorMessageState = signal<string | null>(null);

  // Public Readonly Signals
  readonly products = this.productsState.asReadonly();
  readonly isLoading = this.isLoadingState.asReadonly();
  readonly errorMessage = this.errorMessageState.asReadonly();

  readonly categories = signal<{ value: string; labelEn: string; labelAr: string }[]>([...DEFAULT_CATEGORIES]);

  // Dynamic Top Selling Products based on actual sales and active session orders
  readonly topProducts = computed<TopSellingProduct[]>(() => {
    const map = new Map<string, { name: string; nameAr: string; category: string; categoryAr: string; qty: number; revenue: number; icon: string }>();

    for (const p of this.productsState()) {
      const qty = p.soldCount || 0;
      const rev = p.totalRevenue ?? (qty * p.sellingPrice);
      if (qty > 0 || rev > 0) {
        let cat = p.category || 'Snacks';
        let catAr = p.categoryAr || 'سناكس ومخبوزات';
        if (!p.category || p.category === 'Snacks') {
          const inferred = inferCategoryFromName(p.name);
          cat = inferred.category;
          catAr = inferred.categoryAr;
        }
        map.set(p.name.toLowerCase().trim(), {
          name: p.name,
          nameAr: p.nameAr || p.name,
          category: cat,
          categoryAr: catAr,
          qty,
          revenue: rev,
          icon: p.icon || 'coffee'
        });
      }
    }

    try {
      const ws = this.injector.get(WorkspaceService, null);
      const cs = this.injector.get(ClassroomService, null);
      const sessionItems: any[] = [];

      if (ws) {
        const activeSt = ws.activeStudents() || [];
        const historySt = ws.historyStudents() || [];
        [...activeSt, ...historySt].forEach(s => {
          sessionItems.push(...(s.cateringItems || (s as any).canteenOrders || []));
        });
      }

      if (cs) {
        (cs.cards() || []).forEach(c => {
          sessionItems.push(...(c.cateringItems || []));
        });
      }

      for (const item of sessionItems) {
        const name = item.name || item.nameAr || item.product?.name || item.product?.nameAr;
        if (!name) continue;

        const qty = Number(item.quantity || item.qty || 1);
        const itemPrice = Number(item.unitPrice || item.price || item.product?.sellingPrice || 0);
        const rev = Number(item.totalPrice || item.total || (itemPrice * qty) || 0);

        const key = name.toLowerCase().trim();
        const existing = map.get(key);
        if (existing) {
          existing.qty += qty;
          existing.revenue += rev;
        } else {
          const inferred = inferCategoryFromName(name);
          map.set(key, {
            name: name,
            nameAr: item.nameAr || item.product?.nameAr || name,
            category: item.product?.category || inferred.category,
            categoryAr: item.product?.categoryAr || inferred.categoryAr,
            qty,
            revenue: rev,
            icon: 'coffee'
          });
        }
      }
    } catch {}

    const list = Array.from(map.values()).filter(x => x.qty > 0 || x.revenue > 0);
    list.sort((a, b) => b.revenue - a.revenue);

    return list.slice(0, 5).map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      nameAr: p.nameAr,
      category: p.category,
      categoryAr: p.categoryAr,
      icon: p.icon,
      qty: p.qty,
      revenue: p.revenue
    }));
  });

  // Dynamic Category Revenue Breakdown based on actual product & session catering revenue
  readonly categoryRevenue = computed<CategoryRevenue[]>(() => {
    const map = new Map<string, { amount: number; nameAr: string }>();

    const catLabels: Record<string, string> = {
      'Snacks': 'سناكس ومخبوزات',
      'Beverages': 'مشروبات وعصائر',
      'Coffee': 'قهوة وهوت درينكس',
      'Meals': 'وجبات وسندوتشات',
      'Merchandise': 'ميرش ومنتجات NOOK'
    };

    // 1. Direct products sales
    for (const p of this.productsState()) {
      const rev = p.totalRevenue ?? ((p.soldCount ?? 0) * p.sellingPrice);
      if (rev > 0) {
        let cat = p.category || 'Snacks';
        let catAr = p.categoryAr || 'سناكس ومخبوزات';
        if (!p.category || p.category === 'Snacks') {
          const inferred = inferCategoryFromName(p.name);
          cat = inferred.category;
          catAr = inferred.categoryAr;
        }
        const existing = map.get(cat) || { amount: 0, nameAr: catAr };
        existing.amount += rev;
        map.set(cat, existing);
      }
    }

    // 2. Student & Classroom Session Catering Items
    try {
      const ws = this.injector.get(WorkspaceService, null);
      const cs = this.injector.get(ClassroomService, null);
      const sessionItems: any[] = [];

      if (ws) {
        const activeSt = ws.activeStudents() || [];
        const historySt = ws.historyStudents() || [];
        [...activeSt, ...historySt].forEach(s => {
          sessionItems.push(...(s.cateringItems || (s as any).canteenOrders || []));
        });
      }

      if (cs) {
        (cs.cards() || []).forEach(c => {
          sessionItems.push(...(c.cateringItems || []));
        });
      }

      for (const item of sessionItems) {
        const itemName = item.name || item.nameAr || item.product?.name || item.product?.nameAr || '';
        const qty = Number(item.quantity || item.qty || 1);
        const itemPrice = Number(item.unitPrice || item.price || item.product?.sellingPrice || 0);
        const rev = Number(item.totalPrice || item.total || (itemPrice * qty) || 0);

        if (rev > 0 && itemName) {
          let cat = item.product?.category || item.category;
          let catAr = item.product?.categoryAr || item.categoryAr;

          if (!cat || cat === 'Snacks') {
            const inferred = inferCategoryFromName(itemName);
            cat = inferred.category;
            catAr = inferred.categoryAr;
          } else if (!catAr) {
            catAr = catLabels[cat] || cat;
          }

          const existing = map.get(cat) || { amount: 0, nameAr: catAr };
          existing.amount += rev;
          map.set(cat, existing);
        }
      }
    } catch (e) {
      console.warn('[CateringService] Could not aggregate session items:', e);
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
        categoryAr: val.nameAr || catLabels[cat] || cat,
        amount: Math.round(val.amount),
        maxAmount: Math.ceil(maxVal * 1.1),
        percentage: Math.min(100, Math.round((val.amount / maxVal) * 100))
      });
    });

    return result;
  });

  // Dynamic Total Revenue including session items
  readonly totalRevenue = computed(() => {
    let sum = this.productsState().reduce((acc, p) => acc + (p.totalRevenue ?? ((p.soldCount ?? 0) * p.sellingPrice)), 0);

    try {
      const ws = this.injector.get(WorkspaceService, null);
      const cs = this.injector.get(ClassroomService, null);

      if (ws) {
        const activeSt = ws.activeStudents() || [];
        const historySt = ws.historyStudents() || [];
        [...activeSt, ...historySt].forEach(s => {
          (s.cateringItems || (s as any).canteenOrders || []).forEach((it: any) => {
            const rev = Number(it.totalPrice || it.total || ((it.unitPrice || it.price || 0) * (it.quantity || 1)) || 0);
            sum += rev;
          });
        });
      }

      if (cs) {
        (cs.cards() || []).forEach(c => {
          (c.cateringItems || []).forEach((it: any) => {
            const rev = Number(it.totalPrice || it.total || ((it.unitPrice || it.price || 0) * (it.quantity || 1)) || 0);
            sum += rev;
          });
        });
      }
    } catch {}

    return sum;
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

    const existingProd = this.productsState().find(p => p.id === dto.id);
    const soldCount = (dto as any).soldCount ?? (dto as any).salesCount ?? (dto as any).totalSales ?? existingProd?.soldCount ?? 0;
    const totalRevenue = (dto as any).totalRevenue ?? (dto as any).revenue ?? existingProd?.totalRevenue ?? (soldCount * dto.piecePrice);

    const rawCat = (dto as any).category || existingProd?.category;
    const rawCatAr = (dto as any).categoryAr || existingProd?.categoryAr;

    let category = rawCat;
    let categoryAr = rawCatAr;
    if (!category || category === 'Snacks' || !categoryAr || categoryAr === 'سناكس ومخبوزات') {
      const inferred = inferCategoryFromName(dto.name);
      category = inferred.category;
      categoryAr = inferred.categoryAr;
    }

    return {
      id: dto.id,
      name: dto.name,
      nameAr: dto.name,
      category,
      categoryAr,
      sellingPrice: dto.piecePrice,
      costPrice: dto.cost,
      stock: dto.quantity,
      reorderLevel: 10,
      soldCount: soldCount,
      totalRevenue: totalRevenue,
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
    if (file) {
      formData.append('imageFile', file, file.name);
      formData.append('file', file, file.name);
      formData.append('image', file, file.name);
      formData.append('Image', file, file.name);
    } else if (input.image && typeof input.image === 'string' && !input.image.startsWith('data:')) {
      formData.append('ImageUrl', input.image);
      formData.append('imageUrl', input.image);
    }

    const api$ = this.productApi.createProduct(formData);

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
    if (file) {
      formData.append('imageFile', file, file.name);
      formData.append('file', file, file.name);
      formData.append('image', file, file.name);
      formData.append('Image', file, file.name);
    } else if (updated.image && typeof updated.image === 'string' && !updated.image.startsWith('data:')) {
      formData.append('ImageUrl', updated.image);
      formData.append('imageUrl', updated.image);
    }

    const api$ = this.productApi.updateProduct(updated.id, formData);

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