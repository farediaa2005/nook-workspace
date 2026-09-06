import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../../core/services/language.service';
import { CateringProduct } from '../../../../core/models/catering.model';

@Component({
  selector: 'app-product-success-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-success-modal.component.html',
  styleUrl: './product-success-modal.component.css'
})
export class ProductSuccessModalComponent {
  private langService = inject(LanguageService);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  product = input.required<CateringProduct>();

  addAnother = output<void>();
  viewInventory = output<void>();
}
