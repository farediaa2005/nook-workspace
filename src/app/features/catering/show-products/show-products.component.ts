import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { CateringService } from '../../../core/services/catering.service';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';
import { AddProductModalComponent } from '../components/add-product-modal/add-product-modal.component';
import { ProductSuccessModalComponent } from '../components/product-success-modal/product-success-modal.component';
import { CateringPosModalComponent } from '../components/catering-pos-modal/catering-pos-modal.component';
import { ShiftService } from '../../../core/services/shift.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { CateringProduct } from '../../../core/models/catering.model';
import { exportToCsv } from '../../../core/utils/csv.util';
import { getTodayDateISO, parseIsoToLocalDate } from '../../../core/utils/date-time.util';
import { resolveImageUrl } from '../../../core/utils/image-url.util';

export type CategoryFilterTab = 'all' | 'Snacks' | 'Merchandise' | 'Beverages' | 'Coffee' | 'Meals';

@Component({
  selector: 'app-show-products',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PrimaryButtonComponent,
    SearchBoxComponent,
    CustomSelectComponent,
    AddProductModalComponent,
    ProductSuccessModalComponent,
    CateringPosModalComponent
  ],
  templateUrl: './show-products.component.html',
  styleUrl: './show-products.component.css'
})
export class ShowProductsComponent implements OnInit {
  private langService = inject(LanguageService);
  private cateringService = inject(CateringService);
  private shiftService = inject(ShiftService);
  private workspaceService = inject(WorkspaceService);
  private route = inject(ActivatedRoute);

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  formatDate = (str?: string) => this.langService.formatDateLocale(str);

  ngOnInit(): void {
    this.cateringService.getProducts().subscribe();
    this.route.queryParams.subscribe(params => {
      if (params['search']) {
        this.searchQuery.set(params['search']);
      }
    });
  }

  readonly isLoading = this.cateringService.isLoading;
  readonly errorMessage = this.cateringService.errorMessage;

  // Modal States
  isAddModalOpen = signal<boolean>(false);
  isSuccessModalOpen = signal<boolean>(false);
  isPosModalOpen = signal<boolean>(false);
  lastCreatedProduct = signal<CateringProduct | null>(null);

  // Filter & Search State
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('all');
  failedImages = signal<Set<string>>(new Set<string>());

  onImageError(productId: string): void {
    this.failedImages.update(set => new Set(set).add(productId));
  }

  isImageFailed(productId: string): boolean {
    return this.failedImages().has(productId);
  }

  getProductImage(img?: string | null): string {
    return resolveImageUrl(img);
  }

  // Category Dropdown Options matching site styling & dynamic categories
  categoryOptions = computed<SelectOption[]>(() => {
    const list: SelectOption[] = [
      { value: 'all', label: this.t().allCategories }
    ];
    for (const c of this.cateringService.categories()) {
      list.push({
        value: c.value,
        label: this.isArabic() ? (c.labelAr || c.value) : (c.labelEn || c.value)
      });
    }
    return list;
  });

  onCategorySelect(val: string): void {
    this.selectedCategory.set(val);
  }

  openAddCategoryPrompt(): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'إضافة تصنيف' : 'Add Category')) {
      return;
    }
    const catName = prompt(this.isArabic() ? 'أدخل اسم التصنيف الجديد:' : 'Enter new category name:');
    if (!catName || !catName.trim()) return;

    const trimmed = catName.trim();
    this.cateringService.categories.update(list => {
      if (list.some(c => c.value.toLowerCase() === trimmed.toLowerCase())) return list;
      return [...list, { value: trimmed, labelEn: trimmed, labelAr: trimmed }];
    });
    this.selectedCategory.set(trimmed);
  }

  // All products from service
  allProducts = this.cateringService.products;

  // Filtered Products
  filteredProducts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();

    return this.allProducts().filter(prod => {
      const matchCat = cat === 'all' || prod.category === cat;
      const matchSearch =
        !query ||
        prod.name.toLowerCase().includes(query) ||
        (prod.nameAr && prod.nameAr.includes(query)) ||
        prod.category.toLowerCase().includes(query);

      return matchCat && matchSearch;
    });
  });

  // Pagination state
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  totalPages = computed(() => {
    return Math.ceil(this.filteredProducts().length / this.pageSize()) || 1;
  });

  pagedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredProducts().slice(start, start + this.pageSize());
  });

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  // View mode tab: Inventory vs Sales & Revenue
  activeViewTab = signal<'inventory' | 'sales'>('inventory');

  // Edit Modal State
  isEditModalOpen = signal<boolean>(false);
  productToEdit = signal<CateringProduct | null>(null);
  editName = signal<string>('');
  editCategory = signal<string>('Snacks');
  editSellingPrice = signal<number | null>(null);
  editCostPrice = signal<number | null>(null);
  editStock = signal<number | null>(null);
  editExpirationDate = signal<string>('');
  editImagePreview = signal<string | null>(null);
  editSelectedImageFile = signal<File | null>(null);

  isEditSellingPriceBelowCost = computed(() => {
    const s = this.editSellingPrice();
    const c = this.editCostPrice();
    return s !== null && c !== null && s > 0 && c > 0 && s < c;
  });

  // Date State for Edit Modal
  minExpirationDate = getTodayDateISO();
  editHasNoExpiration = signal<boolean>(false);
  editSelectedDateValue = signal<string>('');

  toggleEditNoExpiration(): void {
    const next = !this.editHasNoExpiration();
    this.editHasNoExpiration.set(next);
    if (next) {
      this.editSelectedDateValue.set('');
      this.editExpirationDate.set('N/A');
    } else {
      this.editExpirationDate.set('');
    }
  }

  onEditDatePicked(val: string): void {
    this.editSelectedDateValue.set(val);
    this.editHasNoExpiration.set(false);
    this.editExpirationDate.set(val);
  }

  openEditDatePicker(inputEl: HTMLInputElement): void {
    if (this.editHasNoExpiration()) return;
    try {
      if (typeof inputEl.showPicker === 'function') {
        inputEl.showPicker();
      } else {
        inputEl.focus();
      }
    } catch {
      inputEl.focus();
    }
  }

  onEditImageFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.editSelectedImageFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.editImagePreview.set(result);
      };
      reader.readAsDataURL(file);
    }
  }

  removeEditImage(): void {
    this.editSelectedImageFile.set(null);
    this.editImagePreview.set(null);
  }

  openEditModal(product: CateringProduct): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'تعديل منتج' : 'Edit Product')) {
      return;
    }
    this.productToEdit.set({ ...product });
    this.editName.set(product.name);
    this.editCategory.set(product.category);
    this.editSellingPrice.set(product.sellingPrice);
    this.editCostPrice.set(product.costPrice);
    this.editStock.set(product.stock);

    const exp = product.expirationDate ? product.expirationDate.trim() : '';
    if (!exp || exp === 'N/A') {
      this.editHasNoExpiration.set(true);
      this.editSelectedDateValue.set('');
      this.editExpirationDate.set('N/A');
    } else {
      const datePart = parseIsoToLocalDate(exp);
      this.editHasNoExpiration.set(false);
      this.editSelectedDateValue.set(datePart);
      this.editExpirationDate.set(datePart);
    }

    const currentImg = product.image ? resolveImageUrl(product.image) : null;
    this.editImagePreview.set(currentImg || null);
    this.editSelectedImageFile.set(null);

    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.productToEdit.set(null);
    this.editImagePreview.set(null);
    this.editSelectedImageFile.set(null);
  }

  saveEditProduct(): void {
    const current = this.productToEdit();
    if (!current || !this.editName().trim()) return;

    const sPrice = Number(this.editSellingPrice()) || 0;
    const cPrice = Number(this.editCostPrice()) || 0;
    const stockVal = Number(this.editStock()) || 0;
    const exp = this.editHasNoExpiration() || !this.editExpirationDate().trim()
      ? 'N/A'
      : this.editExpirationDate().trim();

    const updated: CateringProduct = {
      ...current,
      name: this.editName().trim(),
      category: this.editCategory(),
      sellingPrice: sPrice,
      costPrice: cPrice,
      stock: stockVal,
      expirationDate: exp,
      marginPercent: sPrice > 0 ? Math.round(((sPrice - cPrice) / sPrice) * 100) : 0,
      status: stockVal === 0 ? 'low_stock' : stockVal <= 10 ? 'low_stock' : 'healthy',
      imageFile: this.editSelectedImageFile() || undefined,
      image: this.editImagePreview() || ''
    };

    this.cateringService.updateProduct(updated).subscribe({
      next: () => {
        this.closeEditModal();
      },
      error: (err) => {
        alert(err?.error?.message || err?.message || this.t().failedToUpdateProduct);
      }
    });
  }

  exportProductsToCSV(): void {
    const prods = this.filteredProducts();
    if (!prods || prods.length === 0) return;

    const headers = ['ID', 'Name', 'Category', 'Selling Price', 'Cost Price', 'Stock', 'Expiration', 'Sold Qty', 'Revenue', 'Status'];
    const rows = prods.map((p: CateringProduct) => [
      p.id,
      p.name,
      p.category,
      p.sellingPrice,
      p.costPrice,
      p.stock,
      p.expirationDate || 'N/A',
      p.soldCount || 0,
      p.totalRevenue || 0,
      p.status
    ]);
    exportToCsv(`nook_products_${getTodayDateISO()}.csv`, headers, rows);
  }

  // Delete product
  deleteProduct(id: string): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'حذف منتج' : 'Delete Product')) {
      return;
    }
    this.cateringService.deleteProduct(id).subscribe({
      next: () => {
        this.workspaceService.showToast(this.isArabic() ? 'تم حذف المنتج بنجاح' : 'Product deleted successfully', 'success');
      },
      error: (err) => {
        this.workspaceService.showToast(err?.error?.message || err?.message || (this.isArabic() ? 'فشل حذف المنتج' : 'Failed to delete product'), 'error');
      }
    });
  }

  setCategoryTab(cat: CategoryFilterTab): void {
    this.selectedCategory.set(cat);
  }

  // Modal Handlers
  openAddModal(): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'إضافة منتج جديد' : 'Add New Product')) {
      return;
    }
    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  onProductCreated(product: CateringProduct): void {
    this.lastCreatedProduct.set(product);
    this.isAddModalOpen.set(false);
    this.isSuccessModalOpen.set(true);
    this.cateringService.getProducts().subscribe();
  }

  onAddAnother(): void {
    this.isSuccessModalOpen.set(false);
    this.isAddModalOpen.set(true);
  }

  onViewInventory(): void {
    this.isSuccessModalOpen.set(false);
  }

  openPosModal(): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'نقطة بيع الكاترنج' : 'Catering POS')) {
      return;
    }
    this.isPosModalOpen.set(true);
  }

  closePosModal(): void {
    this.isPosModalOpen.set(false);
    this.cateringService.getProducts().subscribe();
  }

  onSaleCompleted(): void {
    this.cateringService.getProducts().subscribe();
  }
}
