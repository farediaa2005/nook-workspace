import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { CateringService } from '../../../core/services/catering.service';
import { CateringProduct, ProductStatus } from '../../../core/models/catering.model';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';
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
  isSubmitting = signal<boolean>(false);

  categoryOptions = computed<SelectOption[]>(() => [
    { value: 'Snacks', label: this.t().categorySnacks },
    { value: 'Merchandise', label: this.t().categoryMerchandise },
    { value: 'Beverages', label: this.t().categoryBeverages },
    { value: 'Coffee', label: this.t().categoryCoffee },
    { value: 'Meals', label: this.t().categoryMeals }
  ]);

  saveProduct(): void {
    if (this.isSubmitting()) return;
    if (!this.productName().trim()) {
      alert(this.t().pleaseEnterProductName);
      return;
    }
    this.isSubmitting.set(true);

    const nextId = `PROD-${String(this.cateringService.products().length + 1).padStart(3, '0')}`;
    const selling = Number(this.sellingPrice()) || 0;
    const cost = Number(this.costPrice()) || 0;
    const stockQty = Number(this.stock()) || 0;
    const margin = selling > 0 ? Math.round(((selling - cost) / selling) * 100) : 0;
    const expDate = this.expirationDate().trim() || 'N/A';
    const isExp = expDate !== 'N/A' && expDate.toLowerCase().includes('expired');

    let status: ProductStatus = 'healthy';
    if (stockQty <= 10 && stockQty > 0) {
      status = 'low_stock';
    } else if (isExp || stockQty === 0) {
      status = isExp ? 'expired' : 'low_stock';
    }

    const product: CateringProduct = {
      id: nextId,
      name: this.productName().trim(),
      nameAr: this.productNameAr().trim() || this.productName().trim(),
      category: this.category(),
      categoryAr: this.category() === 'Merchandise' ? 'منتجات المساحة' : this.category() === 'Snacks' ? 'سناكس وتسالي' : 'مشروبات',
      image: this.imageUrl().trim(),
      sellingPrice: selling,
      costPrice: cost,
      stock: stockQty,
      expirationDate: expDate,
      isExpired: isExp,
      status: status,
      marginPercent: margin,
      soldCount: 0,
      totalRevenue: 0
    };

    this.cateringService.addProduct(product);
    this.router.navigate(['/catering/show-products']);
  }
}
