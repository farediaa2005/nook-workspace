import { Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../../core/services/language.service';
import { CateringService } from '../../../../core/services/catering.service';
import { CateringProduct, ProductStatus } from '../../../../core/models/catering.model';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-add-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomSelectComponent],
  templateUrl: './add-product-modal.component.html',
  styleUrl: './add-product-modal.component.css'
})
export class AddProductModalComponent {
  private langService = inject(LanguageService);
  private cateringService = inject(CateringService);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // Outputs
  close = output<void>();
  productCreated = output<CateringProduct>();

  // Submitting state (prevent duplicate clicks)
  isSubmitting = signal<boolean>(false);

  // Form State (Clean - No default fake numbers)
  productName = signal<string>('');
  category = signal<string>('Snacks');
  barcode = signal<string>(''); // Purely optional & manual
  sellingPrice = signal<number | null>(null);
  costPrice = signal<number | null>(null);
  initialStock = signal<number | null>(null);
  reorderLevel = signal<number | null>(null);

  // Box / Carton Calculator State
  useBoxCalculator = signal<boolean>(false);
  boxCount = signal<number | null>(null);
  unitsPerBox = signal<number | null>(null);

  // Dynamic Custom Category Creation State
  isAddingNewCategory = signal<boolean>(false);
  newCategoryName = signal<string>('');

  // Date State with Min Date (Today)
  minExpirationDate = new Date().toISOString().split('T')[0];
  selectedDateValue = signal<string>('');
  hasNoExpiration = signal<boolean>(false);
  expirationDate = signal<string>('');
  productImage = signal<string>('');
  imagePreview = signal<string | null>(null);

  // Categories list from service + Add New Category option
  categoryOptions = computed<SelectOption[]>(() => {
    const list = this.cateringService.categories().map(c => ({
      value: c.value,
      label: this.isArabic() ? c.labelAr : c.labelEn
    }));
    return [
      ...list,
      { value: '__new__', label: this.t().addNewCategoryOption }
    ];
  });

  // Calculated Box / Carton Total
  boxTotalUnits = computed(() => {
    const b = Number(this.boxCount()) || 0;
    const u = Number(this.unitsPerBox()) || 0;
    return b * u;
  });

  // Validation
  isProductNameValid = computed(() => {
    const name = this.productName().trim();
    return name.length > 0 && name.length <= 25;
  });

  isSellingPriceBelowCost = computed(() => {
    const s = this.sellingPrice();
    const c = this.costPrice();
    return s !== null && c !== null && s > 0 && c > 0 && s < c;
  });

  isFormValid = computed(() => {
    return this.isProductNameValid() &&
      this.sellingPrice() !== null &&
      this.sellingPrice()! > 0 &&
      this.costPrice() !== null &&
      this.costPrice()! >= 0;
  });

  onCategoryChange(val: string): void {
    if (val === '__new__') {
      this.isAddingNewCategory.set(true);
      this.newCategoryName.set('');
    } else {
      this.category.set(val);
      this.isAddingNewCategory.set(false);
    }
  }

  saveNewCategory(): void {
    const trimmed = this.newCategoryName().trim();
    if (!trimmed) return;
    const created = this.cateringService.addCategory(trimmed, trimmed);
    this.category.set(created.value);
    this.isAddingNewCategory.set(false);
    this.newCategoryName.set('');
  }

  cancelNewCategory(): void {
    this.isAddingNewCategory.set(false);
    this.newCategoryName.set('');
    if (this.category() === '__new__') {
      this.category.set('Snacks');
    }
  }

  toggleBoxCalculator(): void {
    const next = !this.useBoxCalculator();
    this.useBoxCalculator.set(next);
    if (next) {
      this.updateStockFromBoxes();
    }
  }

  updateStockFromBoxes(): void {
    const total = this.boxTotalUnits();
    if (total > 0) {
      this.initialStock.set(total);
    }
  }

  adjustStock(delta: number): void {
    const current = Number(this.initialStock()) || 0;
    this.initialStock.set(Math.max(0, current + delta));
  }

  openDatePicker(inputEl: HTMLInputElement): void {
    if (this.hasNoExpiration()) return;
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

  adjustReorder(delta: number): void {
    const current = Number(this.reorderLevel()) || 0;
    this.reorderLevel.set(Math.max(0, current + delta));
  }

  onDatePicked(val: string): void {
    this.selectedDateValue.set(val);
    this.hasNoExpiration.set(false);
    this.expirationDate.set(val);
  }

  toggleNoExpiration(): void {
    const next = !this.hasNoExpiration();
    this.hasNoExpiration.set(next);
    if (next) {
      this.selectedDateValue.set('');
      this.expirationDate.set('N/A');
    } else {
      this.expirationDate.set('');
    }
  }

  selectedImageFile = signal<File | null>(null);

  onImageFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedImageFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.imagePreview.set(result);
        this.productImage.set(result);
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedImageFile.set(null);
    this.imagePreview.set(null);
    this.productImage.set('');
  }

  submitProduct(): void {
    if (!this.isFormValid() || this.isSubmitting()) return;
    this.isSubmitting.set(true);

    const selling = Number(this.sellingPrice()) || 0;
    const cost = Number(this.costPrice()) || 0;
    const stockVal = Number(this.initialStock()) || 0;
    const reorderVal = this.reorderLevel() !== null ? Number(this.reorderLevel()) : 10;
    const margin = selling > 0 ? Math.round(((selling - cost) / selling) * 100) : 0;
    const isExp = this.expirationDate() !== '' && this.expirationDate().toLowerCase().includes('expired');

    let status: ProductStatus = 'healthy';
    if (stockVal <= reorderVal && stockVal > 0) {
      status = 'low_stock';
    } else if (stockVal === 0) {
      status = 'low_stock';
    } else if (isExp) {
      status = 'expired';
    }

    const cat = this.category();
    const catObj = this.cateringService.categories().find(c => c.value === cat);
    const catAr = catObj ? catObj.labelAr : cat;

    const newProduct: CateringProduct = {
      id: `PROD-${Date.now().toString().slice(-4)}`,
      name: this.productName().trim(),
      nameAr: this.productName().trim(),
      category: cat,
      categoryAr: catAr,
      barcode: this.barcode().trim() || undefined,
      sellingPrice: selling,
      costPrice: cost,
      stock: stockVal,
      reorderLevel: reorderVal,
      expirationDate: this.expirationDate().trim() || 'N/A',
      isExpired: isExp,
      status: status,
      marginPercent: margin,
      soldCount: 0,
      totalRevenue: 0,
      image: this.productImage() || undefined,
      imageFile: this.selectedImageFile() || undefined
    };

    this.productCreated.emit(newProduct);
  }
}
