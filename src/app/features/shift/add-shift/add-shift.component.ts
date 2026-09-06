import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ShiftService } from '../../../core/services/shift.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-add-shift',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './add-shift.component.html',
  styleUrl: './add-shift.component.css'
})
export class AddShiftComponent {
  private shiftService = inject(ShiftService);
  private langService = inject(LanguageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  currencyText = computed(() => this.t().currency);

  // Status of current shift
  hasActiveShift = this.shiftService.hasActiveShift;
  currentActiveStaff = this.shiftService.activeStaffName;
  currentShiftStartTime = this.shiftService.shiftStartTime;

  // Logged-in staff
  currentUser = computed(() => this.authService.getUser());
  staffName = computed(() => this.currentUser()?.name || this.t().frontDeskStaff);
  currentDateStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  currentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Form Inputs
  initialCash = signal<number | null>(null);
  startVodafone = signal<number | null>(null);
  startInstaPay = signal<number | null>(null);
  startFawry = signal<number | null>(null);
  notes = signal<string>('');
  isSubmitting = signal<boolean>(false);

  // Total opening float
  totalOpeningFloat = computed(() => {
    const cash = this.initialCash() || 0;
    const vf = this.startVodafone() || 0;
    const ip = this.startInstaPay() || 0;
    const fw = this.startFawry() || 0;
    return cash + vf + ip + fw;
  });

  canSubmit = computed(() => {
    return !this.hasActiveShift() && this.initialCash() !== null && (this.initialCash() || 0) >= 0 && !this.isSubmitting();
  });

  startShift(): void {
    if (!this.canSubmit() || this.hasActiveShift()) return;

    this.isSubmitting.set(true);
    const cash = this.initialCash() || 0;
    const vf = this.startVodafone() || 0;
    const ip = this.startInstaPay() || 0;
    const fw = this.startFawry() || 0;
    const notesVal = this.notes().trim() || undefined;

    this.shiftService.startShift(cash, vf, ip, fw, notesVal);
    this.isSubmitting.set(false);
    this.router.navigate(['/shift/active']);
  }

  cancel(): void {
    if (this.hasActiveShift()) {
      this.router.navigate(['/shift/active']);
    } else {
      this.router.navigate(['/shift/history']);
    }
  }
}
