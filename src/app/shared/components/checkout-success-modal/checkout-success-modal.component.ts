import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../core/services/language.service';
import { InvoiceService } from '../../../core/services/invoice.service';
import { InvoiceData } from '../../../core/models/invoice.model';

@Component({
  selector: 'app-checkout-success-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout-success-modal.component.html',
  styleUrl: './checkout-success-modal.component.css'
})
export class CheckoutSuccessModalComponent {
  private langService = inject(LanguageService);
  private invoiceService = inject(InvoiceService);

  invoiceData = input.required<InvoiceData>();
  close = output<void>();
  print = output<void>();

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  cateringItems = computed(() => {
    const inv = this.invoiceData();
    if (inv.cateringItemsBreakdown && inv.cateringItemsBreakdown.length > 0) {
      return inv.cateringItemsBreakdown.map(i => ({
        description: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice
      }));
    }
    return (inv.lineItems || []).filter(i => i.type === 'catering');
  });

  onPrint(): void {
    this.invoiceService.printInvoice(this.invoiceData());
    this.print.emit();
  }

  onClose(): void {
    this.close.emit();
  }
}
