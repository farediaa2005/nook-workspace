import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../../core/services/shift.service';
import { LanguageService } from '../../../core/services/language.service';
import { ShiftHistoryItem } from '../../../core/models/shift.model';
import { getSafeAvatar } from '../../../core/utils/avatar.util';
import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { DateFilterDropdownComponent, DateFilterOption } from '../../../shared/components/date-filter-dropdown/date-filter-dropdown.component';

@Component({
  selector: 'app-shift-history',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CustomSelectComponent, 
    PaginationComponent, 
    DateFilterDropdownComponent
  ],
  templateUrl: './shift-history.component.html',
  styleUrl: './shift-history.component.css'
})
export class ShiftHistoryComponent {
  private shiftService = inject(ShiftService);
  private langService = inject(LanguageService);

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  currencyText = computed(() => this.t().currency);

  // Today's ISO date string to enforce max date restriction (cannot pick future dates)
  readonly todayIso = new Date().toISOString().split('T')[0];

  // Date Filter signals
  selectedDateOption = signal<DateFilterOption>('all');
  customDateValue = signal<string>('');

  // Dropdown signals
  selectedStaff = signal<string>('all');
  selectedStatus = signal<string>('all');

  // Search keyword query
  searchQuery = signal<string>('');

  // Pagination signals
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);

  // Dropdown options using t()
  staffOptions = computed<SelectOption[]>(() => {
    const list = this.allHistory();
    const uniqueNames = Array.from(new Set(list.map(i => i.staffName).filter(Boolean)));
    return [
      { value: 'all', label: this.t().allStaffOption },
      ...uniqueNames.map(name => ({ value: name, label: this.langService.formatNameLocale(name) }))
    ];
  });

  statusOptions = computed<SelectOption[]>(() => [
    { value: 'all', label: this.t().allStatusesOption },
    { value: 'balanced', label: this.t().balancedOption },
    { value: 'disputed', label: this.t().disputedOption }
  ]);

  // History dataset
  allHistory = this.shiftService.historyItems;

  // Filtered dataset
  filteredHistory = computed<ShiftHistoryItem[]>(() => {
    let list = this.allHistory();
    const staff = this.selectedStaff();
    const status = this.selectedStatus();
    const dateOpt = this.selectedDateOption();
    const customDate = this.customDateValue();
    const q = this.searchQuery().trim().toLowerCase();

    // 1. Staff Filter
    if (staff !== 'all') {
      list = list.filter(item => item.staffName.toLowerCase().includes(staff.toLowerCase()));
    }

    // 2. Status Filter
    if (status !== 'all') {
      list = list.filter(item => item.status === status);
    }

    // 3. Search Keyword
    if (q) {
      list = list.filter(item => 
        item.staffName.toLowerCase().includes(q) || 
        item.id.toLowerCase().includes(q) ||
        item.date.toLowerCase().includes(q)
      );
    }

    // 4. Date Filter
    if (dateOpt === 'today') {
      const todayStr = new Date().toLocaleDateString(this.isArabic() ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' });
      list = list.filter(item => item.date.includes(todayStr) || item.date.includes('اليوم'));
    } else if (dateOpt === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toLocaleDateString(this.isArabic() ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' });
      list = list.filter(item => item.date.includes(yStr) || item.date.includes('أمس'));
    } else if (dateOpt === 'custom' && customDate) {
      const cd = new Date(customDate);
      const dayNum = cd.getDate().toString();
      list = list.filter(item => item.date.includes(dayNum) || item.date.includes(customDate));
    }

    return list;
  });

  onDateOptionChange(opt: DateFilterOption): void {
    this.selectedDateOption.set(opt);
  }

  onCustomDateChange(val: string): void {
    // Prevent future dates
    if (val > this.todayIso) {
      val = this.todayIso;
    }
    this.customDateValue.set(val);
  }

  onStaffChange(val: string): void {
    this.selectedStaff.set(val);
  }

  onStatusChange(val: string): void {
    this.selectedStatus.set(val);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  applyFilters(): void {
    // Computed signal handles reactivity automatically
  }

  exportExcel(): void {
    const data = this.filteredHistory();
    const curr = this.currencyText();
    const isAr = this.isArabic();

    const headers = isAr
      ? ['الموظف', 'التاريخ', 'فترة الوردية', 'الوارد النقدي', 'المصروفات', 'الرصيد النهائي', 'الفارق', 'الحالة']
      : ['Staff', 'Date', 'Shift Time', 'Cash In', 'Cash Out', 'Final Total', 'Variance', 'Status'];

    const rows = data.map(i => {
      const statusText = i.status === 'balanced'
        ? (isAr ? 'متطابق' : 'Balanced')
        : (isAr ? 'عجز / زيادة' : 'Variance');
      return [
        `"${i.staffName.replace(/"/g, '""')}"`,
        `"${i.date}"`,
        `"${i.startTime} - ${i.endTime}"`,
        `"${i.cashIn} ${curr}"`,
        `"${i.cashOut} ${curr}"`,
        `"${i.finalTotal} ${curr}"`,
        `"${i.variance} ${curr}"`,
        `"${statusText}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `nook_shift_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  exportPDF(): void {
    window.print();
  }

  // Shift Details Modal State (Item 36)
  selectedShiftForDetails = signal<ShiftHistoryItem | null>(null);

  openShiftDetails(item: ShiftHistoryItem): void {
    this.selectedShiftForDetails.set(item);
  }

  closeShiftDetails(): void {
    this.selectedShiftForDetails.set(null);
  }

  getStaffAvatar(item: ShiftHistoryItem | null): string {
    if (!item) return getSafeAvatar(null, 'موظف الاستقبال');
    return getSafeAvatar(item.staffAvatar, item.staffName);
  }
}
