import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ShiftService } from '../../../core/services/shift.service';
import { LanguageService } from '../../../core/services/language.service';
import { ShiftHistoryItem } from '../../../core/models/shift.model';
import { getSafeAvatar } from '../../../core/utils/avatar.util';
import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { DateFilterDropdownComponent, DateFilterOption } from '../../../shared/components/date-filter-dropdown/date-filter-dropdown.component';

@Component({
  selector: 'app-search-shift',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CustomSelectComponent,
    PaginationComponent,
    DateFilterDropdownComponent
  ],
  templateUrl: './search-shift.component.html',
  styleUrl: './search-shift.component.css'
})
export class SearchShiftComponent {
  private shiftService = inject(ShiftService);
  private langService = inject(LanguageService);
  private router = inject(Router);

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  currencyText = computed(() => this.t().currency);

  readonly todayIso = new Date().toISOString().split('T')[0];

  // Filters State
  searchQuery = signal<string>('');
  selectedDateOption = signal<DateFilterOption>('all');
  customDateValue = signal<string>('');
  selectedStaff = signal<string>('all');
  selectedStatus = signal<string>('all');

  // Pagination State
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Dropdown Select Options
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

  // Dataset
  allHistory = this.shiftService.historyItems;

  // Filtered dataset
  filteredList = computed<ShiftHistoryItem[]>(() => {
    let list = this.allHistory();
    const q = this.searchQuery().trim().toLowerCase();
    const staff = this.selectedStaff();
    const status = this.selectedStatus();
    const dateOpt = this.selectedDateOption();
    const customDate = this.customDateValue();

    if (staff !== 'all') {
      list = list.filter(item => item.staffName.toLowerCase().includes(staff.toLowerCase()));
    }

    if (status !== 'all') {
      list = list.filter(item => item.status === status);
    }

    if (q) {
      list = list.filter(item =>
        item.staffName.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.date.toLowerCase().includes(q)
      );
    }

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

  // Summary Metrics
  totalInflows = computed(() => this.filteredList().reduce((acc, curr) => acc + curr.cashIn, 0));
  balancedCount = computed(() => this.filteredList().filter(i => i.status === 'balanced').length);
  disputedCount = computed(() => this.filteredList().filter(i => i.status === 'disputed').length);

  // Paginated List
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredList().length / this.pageSize())));
  paginatedList = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredList().slice(start, start + this.pageSize());
  });

  onDateOptionChange(opt: DateFilterOption): void {
    this.selectedDateOption.set(opt);
    this.currentPage.set(1);
  }

  onCustomDateChange(val: string): void {
    if (val > this.todayIso) val = this.todayIso;
    this.customDateValue.set(val);
    this.currentPage.set(1);
  }

  onStaffChange(val: string): void {
    this.selectedStaff.set(val);
    this.currentPage.set(1);
  }

  onStatusChange(val: string): void {
    this.selectedStatus.set(val);
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedDateOption.set('all');
    this.customDateValue.set('');
    this.selectedStaff.set('all');
    this.selectedStatus.set('all');
    this.currentPage.set(1);
  }

  viewDetails(shiftId: string): void {
    this.router.navigate(['/shift/show-shift', shiftId]);
  }

  exportExcel(): void {
    const data = this.filteredList();
    const curr = this.currencyText();
    const csvContent = 'data:text/csv;charset=utf-8,' +
      ['Shift ID,Staff,Date,Shift Time,Cash In,Cash Out,Final Total,Variance,Status']
      .concat(data.map(i => `"${i.id}","${i.staffName}","${i.date}","${i.startTime} - ${i.endTime}",${i.cashIn} ${curr},${i.cashOut} ${curr},${i.finalTotal} ${curr},${i.variance} ${curr},"${i.status}"`))
      .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nook_shifts_search_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getStaffAvatar(item: ShiftHistoryItem): string {
    return getSafeAvatar(item.staffAvatar, item.staffName);
  }

  exportPDF(): void {
    window.print();
  }
}
