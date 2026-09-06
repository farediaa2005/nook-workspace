import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { generateAvatarSvg } from '../../../core/utils/avatar.util';

@Component({
  selector: 'app-add-student',
  imports: [RouterLink, FormsModule],
  templateUrl: './add-student.component.html',
  styleUrl: './add-student.component.css'
})
export class AddStudentComponent {
  private langService = inject(LanguageService);
  private workspaceService = inject(WorkspaceService);
  private router = inject(Router);

  constructor() {
    this.router.navigate(['/workspace/show-student'], { queryParams: { openCheckIn: 'true' } });
  }

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // Form Fields
  studentName = signal('');
  phone = signal('');
  email = signal('');
  whatsapp = signal('');
  college = signal('');
  faculty = signal('');
  todayDate = new Date().toISOString().split('T')[0];
  selectedDate = signal(new Date().toISOString().split('T')[0]);
  checkInTime = signal(
    `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`
  );
  expectedCheckout = signal('');

  selectedBilling = signal<'new-session' | 'package' | 'coupon'>('new-session');
  packageSelection = signal('');
  sessionPrice = signal(0);
  couponCode = signal('');

  printingCount = signal<number>(0);
  walletAmount = signal<number>(0);
  wifiCode = signal('');

  selectBilling(option: 'new-session' | 'package' | 'coupon'): void {
    this.selectedBilling.set(option);
  }

  incrementPrinting(): void {
    this.printingCount.update(c => c + 1);
  }

  decrementPrinting(): void {
    this.printingCount.update(c => Math.max(0, c - 1));
  }

  onPrintingInput(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.printingCount.set(isNaN(val) || val < 0 ? 0 : val);
  }

  incrementWallet(step: number = 20): void {
    this.walletAmount.update(w => w + step);
  }

  decrementWallet(step: number = 20): void {
    this.walletAmount.update(w => Math.max(0, w - step));
  }

  onWalletInput(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.walletAmount.set(isNaN(val) || val < 0 ? 0 : val);
  }

  openPicker(inputEl: HTMLInputElement): void {
    if ('showPicker' in HTMLInputElement.prototype) {
      try {
        inputEl.showPicker();
      } catch {
        inputEl.focus();
      }
    } else {
      inputEl.focus();
    }
  }

  onConfirmCheckIn(): void {
    const name = this.studentName().trim();
    const phone = this.phone().trim();
    const email = this.email().trim();

    if (!name) {
      this.workspaceService.showToast(
        this.isArabic() ? 'يرجى إدخال اسم الطالب' : 'Please enter student name',
        'error'
      );
      return;
    }

    if (!phone || phone.length !== 11 || !/^\d{11}$/.test(phone)) {
      this.workspaceService.showToast(
        this.isArabic()
          ? 'رقم الهاتف يجب أن يتكون من 11 رقماً (مثال: 01012345678)'
          : 'Phone number must be exactly 11 digits (e.g. 01012345678)',
        'error'
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      this.workspaceService.showToast(this.t().validEmailFormatRequired, 'error');
      return;
    }

    const pkg =
      this.selectedBilling() === 'package'
        ? this.packageSelection()
        : this.selectedBilling() === 'coupon'
          ? this.couponCode() || 'COUPON'
          : 'Hourly Session';

    this.workspaceService.checkInStudent({
      name,
      avatar: generateAvatarSvg(name),
      phone: this.phone() || '010XXXXXXXX',
      email: this.email() || undefined,
      whatsapp: this.whatsapp() || this.phone() || '010XXXXXXXX',
      college: this.college() || 'University',
      faculty: this.faculty() || 'General',
      date: this.selectedDate(),
      checkInTime: this.formatTimeDisplay(this.checkInTime()),
      expectedCheckout: this.expectedCheckout() ? this.formatTimeDisplay(this.expectedCheckout()) : undefined,
      billingType: this.selectedBilling(),
      packageOrCoupon: pkg,
      sessionPrice: this.selectedBilling() === 'new-session' ? this.sessionPrice() : undefined,
      printingCount: this.printingCount(),
      walletAmount: this.walletAmount(),
      wifiCode: this.wifiCode()
    });

    // Navigate to show students page to see the newly added student
    this.router.navigate(['/workspace/show-student']);
  }

  private formatTimeDisplay(timeStr: string): string {
    if (!timeStr) return '--:--';
    const clean = timeStr.trim();
    const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|ص|م)?/i);
    if (!match) return timeStr;
    let h = parseInt(match[1], 10);
    const m = match[2];
    let marker = (match[3] || '').toUpperCase();
    if (marker === 'ص') marker = 'AM';
    if (marker === 'م') marker = 'PM';

    if (!marker) {
      marker = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
    } else {
      h = h % 12 || 12;
    }

    const padHour = String(h).padStart(2, '0');
    return `${padHour}:${m} ${marker}`;
  }
}
