import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { CateringService } from '../../../core/services/catering.service';
import { CateringProduct } from '../../../core/models/catering.model';
import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-add-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CustomSelectComponent],
  templateUrl: './add-products.component.html',
  styleUrl: './add-products.component.css'
})
export class AddProductsComponent {
  private router = inject(Router);
  private langService = inject(LanguageService);
  private cateringService = inject(CateringService);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  productName = signal<string>('');
  productNameAr = signal<string>('');
  category = signal<CateringProduct['category']>('Snacks');
  sellingPrice = signal<number | null>(null);
  costPrice = signal<number | null>(null);
  stock = signal<number | null>(null);
  expirationDate = signal<string>('');
  imageUrl = signal<string>('');
  barcode = signal<string>('');
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  categoryOptions = computed<SelectOption[]>(() => [
    { value: 'Snacks', label: this.t().categorySnacks },
    { value: 'Merchandise', label: this.t().categoryMerchandise },
    { value: 'Beverages', label: this.t().categoryBeverages },
    { value: 'Coffee', label: this.t().categoryCoffee },
    { value: 'Meals', label: this.t().categoryMeals }
  ]);

  saveProduct(): void {
    if (this.isSubmitting()) return;
    const name = this.productName().trim();
    if (!name) {
      alert(this.t().pleaseEnterProductName);
      return;
    }

    const selling = Number(this.sellingPrice()) || 0;
    const cost = Number(this.costPrice()) || 0;
    const stockQty = Number(this.stock()) || 0;
    const expDate = this.expirationDate().trim() || undefined;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.cateringService.addProduct({
      name: name,
      nameAr: this.productNameAr().trim() || name,
      category: this.category(),
      categoryAr: this.category() === 'Merchandise' ? 'منتجات المساحة' : this.category() === 'Snacks' ? 'سناكس وتسالي' : 'مشروبات',
      sellingPrice: selling,
      costPrice: cost,
      stock: stockQty,
      expirationDate: expDate,
      barcode: this.barcode().trim() || undefined,
      image: this.imageUrl().trim() || null
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/catering/show-products']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.message || err?.message || this.t().failedToSaveProduct;
        this.errorMessage.set(msg);
      }
    });
  }
}
