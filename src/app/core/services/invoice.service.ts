import { Injectable, inject } from '@angular/core';
import { InvoiceData } from '../models/invoice.model';
import { LanguageService } from './language.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private langService = inject(LanguageService);
  private authService = inject(AuthService);

  /**
   * Generates a unique sequential invoice number
   */
  generateInvoiceNumber(prefix = 'INV-CLS'): string {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${yearMonth}-${randomSeq}`;
  }

  /**
   * Opens a dedicated print preview window or prints via a hidden iframe
   * with complete Nook brand styling, classroom-focused details, and PDF-ready formatting.
   */
  printInvoice(invoice: InvoiceData): void {
    const isAr = this.langService.isArabic();
    const dir = isAr ? 'rtl' : 'ltr';

    const printContent = `
<!DOCTYPE html>
<html lang="${isAr ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NOOK Invoice - ${invoice.invoiceNumber} - ${invoice.roomOrDesk}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: ${isAr ? "'Cairo', 'Plus Jakarta Sans', sans-serif" : "'Plus Jakarta Sans', 'Cairo', sans-serif"};
      color: #0f172a;
      background: #f8fafc;
      padding: 24px;
      line-height: 1.5;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Top Floating Action Bar (Screen Only) */
    .screen-action-bar {
      max-width: 800px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }
    .screen-action-text {
      font-size: 13.5px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .screen-btns {
      display: flex;
      gap: 10px;
    }
    .btn-action {
      border: none;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: inherit;
      transition: all 0.15s ease;
    }
    .btn-action--print {
      background: #f5b921;
      color: #000000;
    }
    .btn-action--print:hover {
      background: #d97706;
      color: #ffffff;
    }
    .btn-action--close {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
    }
    .btn-action--close:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    /* Main Invoice Card */
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 16px;
      padding: 36px 40px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
      position: relative;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #f5b921;
      padding-bottom: 22px;
      margin-bottom: 24px;
    }
    .brand-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .brand-logo-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-pill {
      background: #0f172a;
      color: #f5b921;
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 1.5px;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #f5b921;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-subtitle {
      font-size: 13px;
      color: #64748b;
      font-weight: 600;
    }

    .invoice-badge-block {
      text-align: ${isAr ? 'left' : 'right'};
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .invoice-tag {
      display: inline-block;
      align-self: ${isAr ? 'flex-start' : 'flex-end'};
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #b45309;
      background: rgba(245, 185, 33, 0.15);
      padding: 3px 10px;
      border-radius: 20px;
      margin-bottom: 4px;
    }
    .invoice-number {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .invoice-date {
      font-size: 12.5px;
      color: #64748b;
      font-weight: 500;
    }

    /* Section Title */
    .section-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Room Details Grid */
    .grid-details {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 20px;
      margin-bottom: 26px;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .detail-item strong {
      color: #64748b;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .detail-item span {
      font-weight: 700;
      color: #0f172a;
      font-size: 14px;
    }
    .detail-item--room span {
      color: #b45309;
      font-size: 16px;
      font-weight: 800;
    }
    .detail-item--actual-time {
      background: rgba(2, 132, 199, 0.05);
      border: 1px solid rgba(2, 132, 199, 0.2);
      border-radius: 8px;
      padding: 6px 10px;
    }
    .badge-item {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      margin-${isAr ? 'right' : 'left'}: 6px;
      vertical-align: middle;
    }
    .badge-item--catering {
      background: rgba(245, 185, 33, 0.15);
      color: #b45309;
      border: 1px solid rgba(245, 185, 33, 0.3);
    }

    /* Table */
    table.invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    table.invoice-table th {
      background: #0f172a;
      color: #ffffff;
      text-align: ${isAr ? 'right' : 'left'};
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 700;
    }
    table.invoice-table td {
      padding: 13px 16px;
      font-size: 13.5px;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
      font-weight: 500;
    }
    table.invoice-table tr:nth-child(even) td {
      background: #fcfcfd;
    }
    .col-qty, .col-price, .col-total {
      text-align: ${isAr ? 'left' : 'right'} !important;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    /* Totals */
    .totals-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
      gap: 20px;
    }
    .payment-summary-box {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .payment-summary-row {
      display: flex;
      justify-content: space-between;
      color: #475569;
    }
    .payment-summary-row strong {
      color: #0f172a;
    }

    .totals-table {
      width: 320px;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 6px 12px;
      font-size: 13.5px;
      border: none;
    }
    .totals-table .total-label {
      text-align: ${isAr ? 'right' : 'left'};
      color: #64748b;
      font-weight: 600;
    }
    .totals-table .total-val {
      text-align: ${isAr ? 'left' : 'right'};
      font-weight: 700;
      color: #0f172a;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .grand-total-row td {
      border-top: 2px solid #f5b921 !important;
      padding-top: 10px !important;
      font-size: 17px !important;
      font-weight: 900 !important;
      color: #0f172a !important;
    }
    .grand-total-row .total-val {
      color: #b45309 !important;
      font-size: 19px !important;
    }

    /* Footer & Stamp */
    .footer {
      border-top: 1.5px dashed #cbd5e1;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .footer-thankyou {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .footer-sub {
      font-size: 11.5px;
      color: #64748b;
    }
    .stamp {
      border: 2.5px solid #10b981;
      color: #059669;
      font-weight: 900;
      padding: 8px 18px;
      border-radius: 8px;
      text-transform: uppercase;
      font-size: 13px;
      letter-spacing: 1px;
      transform: rotate(-3deg);
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.15);
      background: rgba(16, 185, 129, 0.05);
    }
    .team-print-attribution {
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 11px;
      color: #94a3b8;
      font-weight: 500;
    }
    .print-team-logo {
      height: 16px;
      width: auto;
      vertical-align: middle;
    }

    @media print {
      body {
        padding: 0;
        background: transparent;
      }
      .screen-action-bar {
        display: none !important;
      }
      .invoice-container {
        border: none;
        padding: 0;
        box-shadow: none;
        max-width: 100%;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <!-- Floating Top Bar for Staff (Screen only) -->
  <div class="screen-action-bar no-print">
    <div class="screen-action-text">
      <span>🖨️</span>
      <span>${isAr ? 'جاهز للطباعة أو الحفظ بتنسيق PDF' : 'Ready to print or save as PDF'}</span>
    </div>
    <div class="screen-btns">
      <button type="button" class="btn-action btn-action--print" onclick="window.print()">
        ${isAr ? 'طباعة / حفظ كـ PDF' : 'Print / Save PDF'}
      </button>
      <button type="button" class="btn-action btn-action--close" onclick="window.close()">
        ${isAr ? 'إغلاق' : 'Close'}
      </button>
    </div>
  </div>

  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="brand-block">
        <div class="brand-logo-row">
          <span class="brand-pill">NOOK</span>
          <span class="brand-title">NOOK STUDIOS</span>
        </div>
        <div class="brand-subtitle">${isAr ? 'فاتورة حجز واستخدام قاعة تعليمية' : 'Classroom & Studio Rental Invoice'}</div>
      </div>
      <div class="invoice-badge-block">
        <span class="invoice-tag">${isAr ? 'إيصال رسمي' : 'Official Receipt'}</span>
        <div class="invoice-number">${invoice.invoiceNumber}</div>
        <div class="invoice-date">${invoice.issueDate}</div>
      </div>
    </div>

    <!-- Room & Session Information Grid -->
    <div class="section-title">
      <span>📌</span>
      <span>${isAr ? 'بيانات القاعة والجلسة' : 'Room & Session Details'}</span>
    </div>
    <div class="grid-details">
      <div class="detail-item detail-item--room">
        <strong>${isAr ? 'القاعة المحجوزة' : 'Classroom'}</strong>
        <span>${invoice.roomOrDesk}</span>
      </div>
      <div class="detail-item">
        <strong>${isAr ? 'المحاضر / العميل' : 'Instructor / Client'}</strong>
        <span>${invoice.clientName}</span>
      </div>
      ${invoice.clientIdentifier ? `
      <div class="detail-item">
        <strong>${isAr ? 'رقم الهاتف' : 'Phone Number'}</strong>
        <span dir="ltr">${invoice.clientIdentifier}</span>
      </div>
      ` : ''}
      ${invoice.activity ? `
      <div class="detail-item">
        <strong>${isAr ? 'النشاط / المادة' : 'Activity / Subject'}</strong>
        <span>${invoice.activity}</span>
      </div>
      ` : ''}
      <div class="detail-item">
        <strong>${isAr ? 'فترة الجلسة' : 'Session Timing'}</strong>
        <span dir="ltr">${invoice.checkInTime} – ${invoice.checkOutTime}</span>
      </div>
      <div class="detail-item detail-item--actual-time">
        <strong>⏱️ ${isAr ? 'المدة الفعلية المستغرقة' : 'Actual Time Spent'}</strong>
        <span style="color: #0284c7; font-weight: 800;">${invoice.actualDurationFormatted || invoice.durationFormatted}</span>
        ${invoice.durationDifferenceText ? `<span style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px;">${invoice.durationDifferenceText}</span>` : ''}
      </div>
      <div class="detail-item">
        <strong>${isAr ? 'المدة المحسوبة بالفاتورة' : 'Billed Duration'}</strong>
        <span>${invoice.billedDurationFormatted || invoice.durationFormatted}</span>
      </div>
    </div>

    <!-- Line Items Table -->
    <div class="section-title">
      <span>📋</span>
      <span>${isAr ? 'تفاصيل الحساب والخدمات' : 'Itemized Billing'}</span>
    </div>
    <table class="invoice-table">
      <thead>
        <tr>
          <th>${isAr ? 'البند / الخدمة' : 'Item / Description'}</th>
          <th class="col-qty">${isAr ? 'الكمية / المدة' : 'Qty / Dur'}</th>
          <th class="col-price">${isAr ? 'السعر' : 'Rate'}</th>
          <th class="col-total">${isAr ? 'الإجمالي' : 'Total'}</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.lineItems
          .map(
            item => `
          <tr>
            <td>
              <strong>${item.description}</strong>
              ${item.type === 'catering' ? `<span class="badge-item badge-item--catering">${isAr ? 'كاترينج' : 'Catering'}</span>` : ''}
            </td>
            <td class="col-qty">${item.quantity}</td>
            <td class="col-price">${item.unitPrice.toFixed(2)} ${isAr ? 'ج.م' : 'EGP'}</td>
            <td class="col-total"><strong>${item.totalPrice.toFixed(2)} ${isAr ? 'ج.م' : 'EGP'}</strong></td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <!-- Totals & Payment Breakdown -->
    <div class="totals-wrapper">
      <div class="payment-summary-box">
        <div class="payment-summary-row">
          <span>${isAr ? 'طريقة الدفع:' : 'Payment Method:'}</span>
          <strong>${invoice.paymentMethod}</strong>
        </div>
        <div class="payment-summary-row">
          <span>${isAr ? 'الموظف / الكاشير:' : 'Cashier / In-Charge:'}</span>
          <strong>${invoice.cashierName}</strong>
        </div>
        ${invoice.amountReceived > 0 ? `
        <div class="payment-summary-row">
          <span>${isAr ? 'المبلغ المستلم:' : 'Amount Received:'}</span>
          <strong>${invoice.amountReceived.toFixed(2)} ${isAr ? 'ج.م' : 'EGP'}</strong>
        </div>
        ` : ''}
        ${invoice.changeDue > 0 ? `
        <div class="payment-summary-row">
          <span>${isAr ? 'الباقي المسترجع:' : 'Change Returned:'}</span>
          <strong style="color: #10b981;">${invoice.changeDue.toFixed(2)} ${isAr ? 'ج.م' : 'EGP'}</strong>
        </div>
        ` : ''}
      </div>

      <table class="totals-table">
        <tr>
          <td class="total-label">${isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</td>
          <td class="total-val">${invoice.subtotal.toFixed(2)} ${isAr ? 'ج.م' : 'EGP'}</td>
        </tr>
        ${
          invoice.discountAmount > 0
            ? `
        <tr>
          <td class="total-label" style="color: #dc2626;">${isAr ? 'الخصم المطبق:' : 'Discount Applied:'}</td>
          <td class="total-val" style="color: #dc2626;">-${invoice.discountAmount.toFixed(2)} ${isAr ? 'ج.م' : 'EGP'}</td>
        </tr>
        `
            : ''
        }
        <tr class="grand-total-row">
          <td class="total-label">${isAr ? 'الإجمالي النهائي:' : 'Grand Total:'}</td>
          <td class="total-val">${invoice.finalTotal.toFixed(2)} ${isAr ? 'ج.م' : 'EGP'}</td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-text">
        <span class="footer-thankyou">${isAr ? 'شكراً لاختياركم نوك! نسعد دائماً باستضافتكم.' : 'Thank you for choosing Nook! Have a productive session.'}</span>
        <span class="footer-sub">NOOK Coworking & Educational Studios • All rights reserved</span>
      </div>
      <div class="stamp">${isAr ? '✓ مدفوع بالكامل' : '✓ PAID IN FULL'}</div>
    </div>

    <!-- Kernel Panic IT Team Attribution -->
    <div class="team-print-attribution">
      <span>${isAr ? 'تم تصميم وتشغيل النظام البرمجي بواسطة' : 'Software System Engineered & Powered by'}</span>
      <img src="/images/kernel-panic-light.png" alt="Kernel Panic IT Team" class="print-team-logo" />
      <strong style="color: #475569;">Kernel Panic IT Team</strong>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
    `;

    // Open in print window
    const printWindow = window.open('', '_blank', 'width=880,height=920');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
    } else {
      // Fallback: use iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      iframe.contentWindow?.document.open();
      iframe.contentWindow?.document.write(printContent);
      iframe.contentWindow?.document.close();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 500);
    }
  }
}
