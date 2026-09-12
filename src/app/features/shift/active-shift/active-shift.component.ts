import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ShiftService } from '../../../core/services/shift.service';
import { LanguageService } from '../../../core/services/language.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { EndOfShiftModalComponent } from '../../../shared/components/end-of-shift-modal/end-of-shift-modal.component';
import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-active-shift',
  imports: [CommonModule, FormsModule, RouterLink, EndOfShiftModalComponent, CustomSelectComponent],
  templateUrl: './active-shift.component.html',
  styleUrl: './active-shift.component.css'
})
export class ActiveShiftComponent implements OnInit {
  private shiftService = inject(ShiftService);
  private langService = inject(LanguageService);
  private workspaceService = inject(WorkspaceService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  hasActiveShift = this.shiftService.hasActiveShift;
  isLoading = this.shiftService.isLoading;

  ngOnInit(): void {
    this.shiftService.fetchCurrentShiftFromApi();

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params['openClose'] === 'true' || params['close'] === 'true') {
        setTimeout(() => this.openCloseShiftModal(), 80);
      }
    });
  }

  // Metadata signals
  staffName = this.shiftService.activeStaffName;
  staffAvatar = this.shiftService.activeStaffAvatar;
  shiftStartTime = this.shiftService.shiftStartTime;
  shiftDuration = this.shiftService.shiftDuration;

  // 4 Payment Channels Signals
  openingCash = this.shiftService.openingCash;
  expectedCash = this.shiftService.expectedCash;
  vodafoneTotal = this.shiftService.vodafoneTotal;
  vodafoneInside = this.shiftService.vodafoneInside;
  vodafoneOutside = this.shiftService.vodafoneOutside;
  instapayTotal = this.shiftService.instapayTotal;
  instapayInside = this.shiftService.instapayInside;
  instapayOutside = this.shiftService.instapayOutside;
  fawryTotal = this.shiftService.fawryTotal;
  totalFinancialBalance = this.shiftService.totalFinancialBalance;
  adminFund = computed(() => this.shiftService.currentShift()?.adminFund ?? 0);

  // Operational Category Revenues
  workspaceCash = this.shiftService.workspaceCash;
  classroomCash = this.shiftService.classroomCash;
  packageCash = this.shiftService.packageCash;
  cateringCash = this.shiftService.cateringCash;
  otherIncome = this.shiftService.otherIncome;
  adminExpenses = this.shiftService.adminExpenses;
  posReceipts = this.shiftService.posReceipts;

  // Transaction Ledger, Search & Filter (Items 34, 35, 37)
  transactions = this.shiftService.transactions;
  selectedPaymentFilter = signal<string>('all');
  searchQuery = signal<string>('');

  paymentFilterOptions = computed<SelectOption[]>(() => [
    { label: this.t().allPaymentChannels, value: 'all' },
    { label: this.t().cashTillName, value: 'cash' },
    { label: this.t().vodafoneCashName, value: 'vodafone' },
    { label: this.t().instapayName, value: 'instapay' },
    { label: this.t().fawryName, value: 'fawry' }
  ]);

  filteredTransactions = computed(() => {
    let list = this.transactions();
    const filter = this.selectedPaymentFilter();
    const query = this.searchQuery().trim().toLowerCase();

    if (filter !== 'all') {
      list = list.filter(tx => tx.paymentMethod === filter);
    }

    if (query) {
      list = list.filter(tx =>
        (tx.details && tx.details.toLowerCase().includes(query)) ||
        (tx.id && tx.id.toLowerCase().includes(query)) ||
        (tx.staffName && tx.staffName.toLowerCase().includes(query)) ||
        (tx.timestamp && tx.timestamp.toLowerCase().includes(query)) ||
        (tx.amount && tx.amount.toString().includes(query))
      );
    }

    return list;
  });

  formatDuration = (str?: string) => this.langService.formatDurationLocale(str);

  // Currency text
  currencyText = computed(() => this.t().currency);

  // Modal State for Close Shift
  showCloseModal = signal<boolean>(false);

  // ============================================================
  // Modal State for Add Shift Item (Expense / Income) - Issue #15
  // ============================================================
  showAddItemModal = signal<boolean>(false);
  newItemType = signal<'expense' | 'revenue'>('expense');
  newItemCategory = signal<string>('hospitality');
  newItemAmount = signal<number | null>(null);
  newItemPayWay = signal<'cash' | 'vodafone' | 'instapay' | 'fawry'>('cash');
  newItemDescription = signal<string>('');
  isSubmittingItem = signal<boolean>(false);
  amountErrorMessage = signal<string | null>(null);

  quickAmounts = [20, 50, 100, 200, 500];

  readonly expenseCategories = [
    { key: 'hospitality', labelAr: 'ضيافة وبوفيه', labelEn: 'Hospitality', icon: '☕', defaultDescAr: 'مصاريف ضيافة وبوفيه', defaultDescEn: 'Hospitality & Refreshments' },
    { key: 'cleaning', labelAr: 'نظافة ومستهلكات', labelEn: 'Cleaning', icon: '🧹', defaultDescAr: 'أدوات نظافة ومستهلكات', defaultDescEn: 'Cleaning supplies' },
    { key: 'maintenance', labelAr: 'صيانة وإصلاحات', labelEn: 'Maintenance', icon: '🔧', defaultDescAr: 'أعمال صيانة وإصلاحات', defaultDescEn: 'Maintenance & Repairs' },
    { key: 'stationery', labelAr: 'ورق ومطبوعات', labelEn: 'Stationery', icon: '📄', defaultDescAr: 'أدوات مكتبية ومطبوعات', defaultDescEn: 'Stationery & Printing' },
    { key: 'utilities', labelAr: 'فواتير وخدمات', labelEn: 'Utilities', icon: '💡', defaultDescAr: 'سداد فواتير وخدمات', defaultDescEn: 'Utility & Services Bill' },
    { key: 'other', labelAr: 'أخرى', labelEn: 'Other', icon: '🏷️', defaultDescAr: 'مصروفات نثرية متنوعة', defaultDescEn: 'Petty Cash Expense' },
  ];

  readonly revenueCategories = [
    { key: 'canteen', labelAr: 'كافيه ومشروبات', labelEn: 'Cafe & Drinks', icon: '☕', defaultDescAr: 'مبيعات كافيه ومشروبات سريعة', defaultDescEn: 'Cafe & Beverages Sale' },
    { key: 'printing', labelAr: 'طباعة وتصوير ورق', labelEn: 'Printing & Handouts', icon: '🖨️', defaultDescAr: 'خدمات طباعة وتصوير أوراق', defaultDescEn: 'Printing & Paper Handouts' },
    { key: 'extra', labelAr: 'إيراد إضافي', labelEn: 'Extra Income', icon: '💰', defaultDescAr: 'إيراد إضافي متنوع', defaultDescEn: 'Additional Revenue' },
    { key: 'settlement', labelAr: 'تسوية حساب', labelEn: 'Settlement', icon: '🔄', defaultDescAr: 'تسوية حساب وفروق نقدية', defaultDescEn: 'Account settlement' },
    { key: 'deposit', labelAr: 'تغذية خزينة', labelEn: 'Drawer Top-up', icon: '📥', defaultDescAr: 'إيداع وتغذية الخزينة', defaultDescEn: 'Cash Drawer Top-up' },
    { key: 'other', labelAr: 'أخرى', labelEn: 'Other', icon: '🏷️', defaultDescAr: 'إيراد تشغيلي آخر', defaultDescEn: 'Other Operating Income' },
  ];

  readonly paymentChannels: { key: 'cash' | 'vodafone' | 'instapay' | 'fawry'; labelAr: string; labelEn: string; icon: string; badge: string }[] = [
    { key: 'cash', labelAr: 'خزينة نقدية (الدرج)', labelEn: 'Cash Drawer', icon: '💵', badge: 'Cash' },
    { key: 'vodafone', labelAr: 'فودافون كاش', labelEn: 'Vodafone Cash', icon: '📱', badge: 'VF Cash' },
    { key: 'instapay', labelAr: 'إنستاباي', labelEn: 'InstaPay', icon: '⚡', badge: 'InstaPay' },
    { key: 'fawry', labelAr: 'فوري / POS', labelEn: 'Fawry / POS', icon: '💳', badge: 'POS' },
  ];

  openCloseShiftModal(): void {
    this.showCloseModal.set(true);
  }

  closeModal(): void {
    this.showCloseModal.set(false);
  }

  onShiftClosed(): void {
    this.showCloseModal.set(false);
    this.router.navigate(['/shift/history']);
  }

  openAddItemModal(): void {
    this.newItemType.set('expense');
    this.newItemCategory.set('hospitality');
    this.newItemAmount.set(null);
    this.newItemPayWay.set('cash');
    this.newItemDescription.set(this.isArabic() ? 'مصاريف ضيافة وبوفيه' : 'Hospitality & Refreshments');
    this.amountErrorMessage.set(null);
    this.isSubmittingItem.set(false);
    this.showAddItemModal.set(true);
  }

  closeAddItemModal(): void {
    if (this.isSubmittingItem()) return;
    this.showAddItemModal.set(false);
    this.amountErrorMessage.set(null);
  }

  setItemType(type: 'expense' | 'revenue'): void {
    this.newItemType.set(type);
    this.amountErrorMessage.set(null);
    if (type === 'expense') {
      this.newItemCategory.set('hospitality');
      this.newItemDescription.set(this.isArabic() ? 'مصاريف ضيافة وبوفيه' : 'Hospitality & Refreshments');
    } else {
      this.newItemCategory.set('extra');
      this.newItemDescription.set(this.isArabic() ? 'إيراد إضافي متنوع' : 'Additional Revenue');
    }
  }

  setPaymentChannel(channel: 'cash' | 'vodafone' | 'instapay' | 'fawry'): void {
    this.newItemPayWay.set(channel);
  }

  selectCategoryChip(cat: any): void {
    this.newItemCategory.set(cat.key);
    this.newItemDescription.set(this.isArabic() ? cat.defaultDescAr : cat.defaultDescEn);
  }

  applyQuickAmount(amount: number): void {
    const cur = this.newItemAmount() || 0;
    this.newItemAmount.set(+(cur + amount).toFixed(2));
    this.amountErrorMessage.set(null);
  }

  clearAmount(): void {
    this.newItemAmount.set(null);
    this.amountErrorMessage.set(null);
  }

  onAmountChange(val: number | null): void {
    this.newItemAmount.set(val);
    if (val && val > 0) {
      this.amountErrorMessage.set(null);
    }
  }

  submitAddItem(): void {
    if (this.isSubmittingItem()) return;

    const amt = this.newItemAmount();
    if (!amt || amt <= 0) {
      this.amountErrorMessage.set(this.isArabic() ? 'يرجى إدخال مبلغ صحيح أكبر من صفر' : 'Please enter a valid amount greater than zero');
      return;
    }

    this.isSubmittingItem.set(true);
    this.amountErrorMessage.set(null);

    const type = this.newItemType();
    const cat = this.newItemCategory();
    const pay = this.newItemPayWay();
    const desc = this.newItemDescription().trim() || (type === 'expense' 
      ? (this.isArabic() ? 'مصروفات وردية' : 'Shift Expense') 
      : (this.isArabic() ? 'إيراد إضافي' : 'Additional Income'));

    this.shiftService.addManualShiftItem({
      amount: amt,
      type,
      paymentMethod: pay,
      description: desc,
      category: cat
    }).subscribe({
      next: () => {
        this.isSubmittingItem.set(false);
        const toastMsg = this.isArabic()
          ? (type === 'expense' ? `تم تسجيل مصروف بقيمة ${amt.toFixed(2)} ج.م بنجاح` : `تم تسجيل إيراد بقيمة ${amt.toFixed(2)} ج.م بنجاح`)
          : (type === 'expense' ? `Expense of ${amt.toFixed(2)} EGP recorded successfully` : `Revenue of ${amt.toFixed(2)} EGP recorded successfully`);
        this.workspaceService.showToast(toastMsg, 'success');
        this.closeAddItemModal();
      },
      error: (err) => {
        this.isSubmittingItem.set(false);
        const msg = err?.error?.message || err?.message || (this.isArabic() ? 'تعذر تسجيل البند في السيرفر' : 'Failed to record item on server');
        this.workspaceService.showToast(msg, 'error');
      }
    });
  }

  isRecalculating = signal<boolean>(false);

  recalculateShift(): void {
    if (this.isRecalculating()) return;
    this.isRecalculating.set(true);

    this.shiftService.recalculateCurrentShift().subscribe({
      next: (ok) => {
        this.isRecalculating.set(false);
        if (ok) {
          this.workspaceService.showToast(
            this.isArabic() ? 'تم تحديث وتدقيق حسابات الوردية بنجاح!' : 'Shift accounts updated and recalculated successfully!',
            'success'
          );
        } else {
          this.shiftService.fetchCurrentShiftFromApi();
          this.workspaceService.showToast(
            this.isArabic() ? 'تمت مزامنة بيانات الوردية' : 'Shift data synchronized',
            'info'
          );
        }
      },
      error: () => {
        this.isRecalculating.set(false);
        this.shiftService.fetchCurrentShiftFromApi();
      }
    });
  }

  resetShiftData(): void {
    this.shiftService.resetShiftDataForTesting();
    this.workspaceService.showToast(
      this.isArabic() ? 'تم تصفير أرقام الوردية للاختبار من الصفر!' : 'Shift data reset to zero for test run!',
      'info'
    );
  }

  isDeletingAll = signal<boolean>(false);

  deleteAllShiftData(): void {
    if (this.isDeletingAll()) return;
    this.isDeletingAll.set(true);

    this.shiftService.deleteAllShiftItems().subscribe({
      next: () => {
        this.isDeletingAll.set(false);
        this.workspaceService.showToast(
          this.isArabic() ? 'تم حذف جميع بنود الوردية بالكامل من الخادم بنجاح!' : 'All shift items permanently deleted from server!',
          'success'
        );
      },
      error: () => {
        this.isDeletingAll.set(false);
      }
    });
  }

  // ============================================================
  // Delete Shift Transaction Item
  // ============================================================
  isDeletingItem = signal<string | null>(null);
  showDeleteConfirmModal = signal<boolean>(false);
  deleteTargetTx = signal<{ id: string; details: string; amount: number } | null>(null);

  deleteTransaction(tx: { id: string; details: string; amount: number }): void {
    if (this.isDeletingItem()) return;
    this.deleteTargetTx.set(tx);
    this.showDeleteConfirmModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirmModal.set(false);
    this.deleteTargetTx.set(null);
  }

  confirmDelete(): void {
    const tx = this.deleteTargetTx();
    if (!tx) return;

    this.showDeleteConfirmModal.set(false);
    this.isDeletingItem.set(tx.id);
    this.shiftService.deleteShiftItem(tx.id).subscribe({
      next: (ok) => {
        this.isDeletingItem.set(null);
        this.deleteTargetTx.set(null);
        if (ok) {
          this.workspaceService.showToast(
            this.isArabic() ? 'تم حذف البند بنجاح' : 'Item deleted successfully',
            'success'
          );
        } else {
          this.workspaceService.showToast(
            this.isArabic() ? 'تعذر حذف البند من السيرفر' : 'Failed to delete item from server',
            'error'
          );
        }
      },
      error: () => {
        this.isDeletingItem.set(null);
        this.deleteTargetTx.set(null);
        this.workspaceService.showToast(
          this.isArabic() ? 'حدث خطأ أثناء حذف البند' : 'Error deleting item',
          'error'
        );
      }
    });
  }

}
