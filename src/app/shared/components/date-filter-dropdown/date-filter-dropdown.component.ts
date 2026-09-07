import { Component, input, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';
import { getTodayDateISO } from '../../../core/utils/date-time.util';

export type DateFilterOption = 'today' | 'yesterday' | 'all' | 'custom';

@Component({
  selector: 'app-date-filter-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './date-filter-dropdown.component.html',
  styleUrl: './date-filter-dropdown.component.css'
})
export class DateFilterDropdownComponent {
  private langService = inject(LanguageService);
  t = this.langService.t;

  selectedOption = input<DateFilterOption>('today');
  customDate = input<string>('');
  maxDate = input<string>(getTodayDateISO());

  optionChange = output<DateFilterOption>();
  customDateChange = output<string>();

  isOpen = signal<boolean>(false);

  // Today's date YYYY-MM-DD for max date restraint (no future dates)
  todayDateIso = computed(() => getTodayDateISO());

  toggleDropdown(): void {
    this.isOpen.update(v => !v);
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  selectOption(opt: DateFilterOption): void {
    this.optionChange.emit(opt);
    this.isOpen.set(false);
  }

  onCustomDateInput(val: string): void {
    if (!val) return;
    // Guard against future date input
    const max = this.maxDate() || this.todayDateIso();
    const cleanVal = val > max ? max : val;

    this.customDateChange.emit(cleanVal);
    this.optionChange.emit('custom');
    this.isOpen.set(false);
  }

  getDisplayLabel(): string {
    const opt = this.selectedOption();
    const isAr = this.langService.isArabic();
    const now = new Date();

    if (opt === 'today') {
      return isAr
        ? `اليوم، ${now.getDate()} ${this.getArMonth(now.getMonth())}`
        : `Today, ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    if (opt === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return isAr
        ? `أمس، ${y.getDate()} ${this.getArMonth(y.getMonth())}`
        : `Yesterday, ${y.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    if (opt === 'all') {
      return this.t().allDates || (isAr ? 'كل التواريخ' : 'All Dates');
    }

    if (opt === 'custom' && this.customDate()) {
      const d = new Date(this.customDate());
      if (!isNaN(d.getTime())) {
        return isAr
          ? `${d.getDate()} ${this.getArMonth(d.getMonth())} ${d.getFullYear()}`
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return this.customDate();
    }

    return this.t().selectDate || (isAr ? 'اختر التاريخ' : 'Select Date');
  }

  getTodayMenuLabel(): string {
    const isAr = this.langService.isArabic();
    const now = new Date();
    return isAr
      ? `اليوم (${now.getDate()} ${this.getArMonth(now.getMonth())})`
      : `Today (${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
  }

  getYesterdayMenuLabel(): string {
    const isAr = this.langService.isArabic();
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return isAr
      ? `أمس (${y.getDate()} ${this.getArMonth(y.getMonth())})`
      : `Yesterday (${y.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
  }

  private getArMonth(m: number): string {
    const arMonths = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return arMonths[m] || '';
  }
}
