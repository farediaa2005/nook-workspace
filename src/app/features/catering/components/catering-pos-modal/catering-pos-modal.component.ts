import { Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../../core/services/language.service';
import { CateringService } from '../../../../core/services/catering.service';
import { ShiftService } from '../../../../core/services/shift.service';
import { CateringProduct, PosCartItem } from '../../../../core/models/catering.model';
import { resolveImageUrl } from '../../../../core/utils/image-url.util';

export type PosCategoryTab = 'all' | 'Coffee' | 'Snacks' | 'Meals' | 'Beverages' | 'Merchandise' | string;

export interface PosTargetRoomItem {
  id?: string;
  name: string;
  nameAr?: string;
  price: number;
  quantity: number;
  total?: number;
  time?: string;
}

export interface PosTargetRoom {
  id: string;
  name: string;
  instructor?: string;
  currentCatering?: number;
  items?: PosTargetRoomItem[];
}

@Component({
  selector: 'app-catering-pos-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catering-pos-modal.component.html',
  styleUrl: './catering-pos-modal.component.css'
})
export class CateringPosModalComponent {
  private langService = inject(LanguageService);
  private cateringService = inject(CateringService);
  private shiftService = inject(ShiftService);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // ViewChild for Category Pills Scrolling
  pillsBarRef = viewChild<ElementRef<HTMLDivElement>>('pillsBar');

  // Optional target room if opened from Classroom
  targetRoom = input<PosTargetRoom | null>(null);

  // Previous Orders Expansion State
  showPreviousOrders = signal(false);

  togglePreviousOrders(): void {
    this.showPreviousOrders.update(v => !v);
  }

  previousItemsList = computed<PosTargetRoomItem[]>(() => {
    const room = this.targetRoom();
    if (!room) return [];
    if (room.items && room.items.length > 0) {
      return room.items;
    }
    const current = room.currentCatering || 0;
    if (current > 0) {
      return [
        { name: 'Session Catering Order', nameAr: 'طلب كاترنج للجلسة', price: current, quantity: 1, total: current, time: '' }
      ];
    }
    return [];
  });

  // Outputs
  close = output<void>();
  saleCompleted = output<void>();
  addToRoomSession = output<{ roomId: string; items: PosCartItem[]; total: number }>();

  // Shift & Cashier
  activeStaffName = this.shiftService.activeStaffName;
  currentShift = this.shiftService.currentShift;

  // State
  selectedCategory = signal<string>('all');
  searchQuery = signal<string>('');
  cartItems = signal<PosCartItem[]>([]);
  discountAmount = signal<number>(0);
  isSuccessState = signal<boolean>(false);
  successMessage = signal<string>('');

  allProducts = this.cateringService.products;

  categoryTabs = computed<{ key: string; labelEn: string; labelAr: string }[]>(() => {
    const list = this.cateringService.categories().map(c => ({
      key: c.value,
      labelEn: c.labelEn,
      labelAr: c.labelAr
    }));
    return [
      { key: 'all', labelEn: 'All Items', labelAr: 'جميع الأصناف' },
      ...list
    ];
  });

  scrollPills(direction: 'left' | 'right'): void {
    const el = this.pillsBarRef()?.nativeElement;
    if (!el) return;
    const step = direction === 'left' ? -180 : 180;
    el.scrollBy({ left: step, behavior: 'smooth' });
  }

  onPillsWheel(e: WheelEvent): void {
    const el = this.pillsBarRef()?.nativeElement;
    if (!el) return;
    if (e.deltaY !== 0) {
      e.preventDefault();
      el.scrollBy({ left: e.deltaY * 1.5, behavior: 'smooth' });
    }
  }

  filteredProducts = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().trim().toLowerCase();

    return this.allProducts().filter(prod => {
      const matchCat = cat === 'all' || prod.category === cat;
      const matchSearch = !query ||
        prod.name.toLowerCase().includes(query) ||
        (prod.nameAr && prod.nameAr.includes(query));
      return matchCat && matchSearch;
    });
  });

  cartSubtotal = computed(() => {
    return this.cartItems().reduce((sum, item) => sum + item.totalPrice, 0);
  });

  cartTotal = computed(() => {
    return Math.max(0, this.cartSubtotal() - this.discountAmount());
  });

  cartCount = computed(() => {
    return this.cartItems().reduce((sum, item) => sum + item.quantity, 0);
  });

  selectCategory(cat: string): void {
    this.selectedCategory.set(cat);
  }

  isProductExpired(product: CateringProduct): boolean {
    if (product.status === 'expired' || product.isExpired) return true;
    if (product.expirationDate && product.expirationDate !== 'N/A') {
      const exp = new Date(product.expirationDate);
      if (!isNaN(exp.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return exp.getTime() < today.getTime();
      }
    }
    return false;
  }

  failedImages = signal<Set<string>>(new Set<string>());

  onImageError(productId: string): void {
    this.failedImages.update(set => new Set(set).add(productId));
  }

  isImageFailed(productId: string): boolean {
    return this.failedImages().has(productId);
  }

  getProductImage(img?: string | null, id?: string): string {
    const resolved = resolveImageUrl(img);
    if (resolved) return resolved;
    if (id) {
      try {
        const cached = localStorage.getItem('nook_product_img_' + id);
        if (cached) return cached;
      } catch {}
    }
    return '';
  }

  getProductType(product: CateringProduct): 'coffee' | 'water' | 'beverage' | 'snack' {
    const text = `${product.name} ${product.nameAr || ''} ${product.category || ''} ${product.categoryAr || ''}`.toLowerCase();
    if (text.includes('مياه') || text.includes('water') || text.includes('معدنية')) return 'water';
    if (text.includes('قهوة') || text.includes('نسكافيه') || text.includes('كابتشينو') || text.includes('لاتيه') || text.includes('coffee') || text.includes('tea') || text.includes('شاي') || text.includes('اسبريسو')) return 'coffee';
    if (text.includes('عصير') || text.includes('بيبسي') || text.includes('كولا') || text.includes('صودا') || text.includes('ريد بول') || text.includes('سفن') || text.includes('beverage') || text.includes('drink') || text.includes('مشروب')) return 'beverage';
    return 'snack';
  }

  getAvailableStock(product: CateringProduct): number {
    const inCart = this.cartItems().find(i => i.product.id === product.id)?.quantity || 0;
    return Math.max(0, product.stock - inCart);
  }

  addToCart(product: CateringProduct): void {
    if (this.isProductExpired(product) || this.getAvailableStock(product) <= 0) return;

    this.cartItems.update(items => {
      const existing = items.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return items;
        return items.map(i =>
          i.product.id === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                totalPrice: (i.quantity + 1) * i.unitPrice
              }
            : i
        );
      } else {
        const newItem: PosCartItem = {
          product,
          quantity: 1,
          unitPrice: product.sellingPrice,
          totalPrice: product.sellingPrice
        };
        return [...items, newItem];
      }
    });
  }

  incrementItem(productId: string): void {
    this.cartItems.update(items => {
      return items.map(item => {
        if (item.product.id !== productId) return item;
        const maxStock = item.product.stock;
        if (item.quantity >= maxStock) return item;
        const newQty = item.quantity + 1;
        return {
          ...item,
          quantity: newQty,
          totalPrice: newQty * item.unitPrice
        };
      });
    });
  }

  decrementItem(productId: string): void {
    this.cartItems.update(items => {
      return items
        .map(item => {
          if (item.product.id !== productId) return item;
          const newQty = item.quantity - 1;
          return {
            ...item,
            quantity: newQty,
            totalPrice: newQty * item.unitPrice
          };
        })
        .filter(item => item.quantity > 0);
    });
  }

  removeItem(productId: string): void {
    this.cartItems.update(items => items.filter(i => i.product.id !== productId));
  }

  clearCart(): void {
    this.cartItems.set([]);
  }

  completeCashSale(): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'إتمام عملية البيع' : 'Complete Sale')) {
      return;
    }
    if (this.cartItems().length === 0) return;

    const total = this.cartTotal();
    const items = this.cartItems();
    const itemsSummary = items.map(i => `${i.product.name} (x${i.quantity})`).join(', ');

    // 1. Deduct stock and update catering analytics
    this.cateringService.processPosSale({
      items,
      paymentMethod: 'cash',
      total
    });

    // 2. Record on the active shift of the cashier!
    this.shiftService.recordTransaction({
      type: 'canteen',
      amount: total,
      paymentMethod: 'cash',
      details: `مبيعات كافيتريا نقدية: ${itemsSummary}`
    });

    this.successMessage.set(this.t().saleSuccessShift);
    this.isSuccessState.set(true);
    setTimeout(() => {
      this.isSuccessState.set(false);
      this.clearCart();
      this.saleCompleted.emit();
    }, 1200);
  }

  confirmAddToRoomSession(): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'إضافة طلب للقاعة' : 'Add to Room Session')) {
      return;
    }
    const room = this.targetRoom();
    if (!room || this.cartItems().length === 0) return;

    const total = this.cartTotal();
    const items = this.cartItems();
    const itemsSummary = items.map(i => `${i.product.name} (x${i.quantity})`).join(', ');

    // 1. Deduct stock in catering
    this.cateringService.processPosSale({
      items,
      paymentMethod: 'app',
      total
    });

    // 2. Record under the active shift
    this.shiftService.recordTransaction({
      type: 'canteen',
      amount: total,
      paymentMethod: 'room_session',
      details: `طلب كاترنج لقاعة ${room.name} (${room.instructor || 'محاضر'}): ${itemsSummary}`
    });

    this.successMessage.set(this.t().addedToRoomAndShiftSuccess);
    this.isSuccessState.set(true);
    setTimeout(() => {
      this.isSuccessState.set(false);
      this.addToRoomSession.emit({
        roomId: room.id,
        items,
        total
      });
      this.clearCart();
      this.close.emit();
    }, 1000);
  }
}
