import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { CateringService } from '../../../core/services/catering.service';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';
import { AddProductModalComponent } from '../components/add-product-modal/add-product-modal.component';
import { ProductSuccessModalComponent } from '../components/product-success-modal/product-success-modal.component';
import { CateringPosModalComponent } from '../components/catering-pos-modal/catering-pos-modal.component';
import { CateringProduct } from '../../../core/models/catering.model';

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

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  formatDate = (str?: string) => this.langService.formatDateLocale(str);

  ngOnInit(): void {
    this.cateringService.syncWithBackend();
  }

  // Modal States
  isAddModalOpen = signal<boolean>(false);
  isSuccessModalOpen = signal<boolean>(false);
  isPosModalOpen = signal<boolean>(false);
  lastCreatedProduct = signal<CateringProduct | null>(null);

  // Filter & Search State
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('all');

  // Category Dropdown Options matching site styling
  categoryOptions = computed<SelectOption[]>(() => [
    { value: 'all', label: this.t().allCategories },
    { value: 'Snacks', label: this.t().categorySnacks },
    { value: 'Merchandise', label: this.t().categoryMerchandise },
    { value: 'Beverages', label: this.t().categoryBeverages },
    { value: 'Coffee', label: this.t().categoryCoffee },
    { value: 'Meals', label: this.t().categoryMeals }
  ]);

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

  isEditSellingPriceBelowCost = computed(() => {
    const s = this.editSellingPrice();
    const c = this.editCostPrice();
    return s !== null && c !== null && s > 0 && c > 0 && s < c;
  });

  // Date State for Edit Modal
  minExpirationDate = new Date().toISOString().split('T')[0];
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

  openEditModal(product: CateringProduct): void {
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
      const datePart = exp.includes('T') ? exp.split('T')[0] : exp;
      this.editHasNoExpiration.set(false);
      this.editSelectedDateValue.set(datePart);
      this.editExpirationDate.set(datePart);
    }

    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.productToEdit.set(null);
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
      status: stockVal === 0 ? 'low_stock' : stockVal <= 10 ? 'low_stock' : 'healthy'
    };

    this.cateringService.updateProduct(updated);
    this.closeEditModal();
  }

  exportProductsToCSV(): void {
    const prods = this.filteredProducts();
    if (!prods || prods.length === 0) return;

    const headers = ['ID', 'Name', 'Category', 'Selling Price', 'Cost Price', 'Stock', 'Expiration', 'Sold Qty', 'Revenue', 'Status'];
    const rows = prods.map((p: CateringProduct) => [
      p.id,
      `"${p.name}"`,
      `"${p.category}"`,
      p.sellingPrice,
      p.costPrice,
      p.stock,
      `"${p.expirationDate || 'N/A'}"`,
      p.soldCount || 0,
      p.totalRevenue || 0,
      p.status
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r: (string | number)[]) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `nook_products_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Delete product
  deleteProduct(id: string): void {
    if (confirm(this.t().confirmDeleteProduct)) {
      this.cateringService.deleteProduct(id);
    }
  }

  setCategoryTab(cat: CategoryFilterTab): void {
    this.selectedCategory.set(cat);
  }

  // Modal Handlers
  openAddModal(): void {
    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  onProductCreated(product: CateringProduct): void {
    try {
      this.cateringService.addProduct(product);
    } catch (err) {
      console.warn('[ShowProducts] Add product warning:', err);
    }
    this.lastCreatedProduct.set(product);
    this.isAddModalOpen.set(false);
    this.isSuccessModalOpen.set(true);
  }

  onAddAnother(): void {
    this.isSuccessModalOpen.set(false);
    this.isAddModalOpen.set(true);
  }

  onViewInventory(): void {
    this.isSuccessModalOpen.set(false);
  }

  openPosModal(): void {
    this.isPosModalOpen.set(true);
  }

  closePosModal(): void {
    this.isPosModalOpen.set(false);
  }
}
