import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ShiftService } from '../../../core/services/shift.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-add-shift',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './add-shift.component.html',
  styleUrl: './add-shift.component.css'
})
export class AddShiftComponent implements OnInit {
  private shiftService = inject(ShiftService);
  private langService = inject(LanguageService);
  private authService = inject(AuthService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  ngOnInit(): void {
    this.shiftService.fetchCurrentShiftFromApi();
  }

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  currencyText = computed(() => this.t().currency);

  // Status of current shift
  hasActiveShift = this.shiftService.hasActiveShift;
  currentActiveStaff = this.shiftService.activeStaffName;
  currentShiftStartTime = this.shiftService.shiftStartTime;

  // Logged-in staff
  currentUser = computed(() => this.authService.getUser());
  isAdmin = computed(() => this.authService.getRole() === 'admin' || this.currentUser()?.role === 'admin');

  currentDateStr = computed(() => {
    return new Date().toLocaleDateString(this.isArabic() ? 'ar-EG' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });
  currentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Form Inputs (defaulted to 0 for instant readiness and clean UX)
  initialCash = signal<number>(0);
  startVodafone = signal<number>(0);
  startInstaPay = signal<number>(0);
  startFawry = signal<number>(0);
  notes = signal<string>('');
  isSubmitting = signal<boolean>(false);

  // Total opening float
  totalOpeningFloat = computed(() => {
    const cash = Number(this.initialCash()) || 0;
    const vf = Number(this.startVodafone()) || 0;
    const ip = Number(this.startInstaPay()) || 0;
    const fw = Number(this.startFawry()) || 0;
    return cash + vf + ip + fw;
  });

  canSubmit = computed(() => {
    return (
      !this.hasActiveShift() &&
      this.initialCash() !== null &&
      Number(this.initialCash()) >= 0 &&
      !this.isSubmitting()
    );
  });

  startShift(): void {
    if (!this.canSubmit() || this.hasActiveShift()) return;

    this.isSubmitting.set(true);
    const cash = Number(this.initialCash()) || 0;
    const vf = Number(this.startVodafone()) || 0;
    const ip = Number(this.startInstaPay()) || 0;
    const fw = Number(this.startFawry()) || 0;
    const notesVal = this.notes().trim() || undefined;

    this.shiftService.startShift(
      cash,
      vf,
      ip,
      fw,
      notesVal,
      (success, errorMsg) => {
        this.isSubmitting.set(false);
        if (success) {
          this.notification.success(
            this.isArabic() ? 'تم فتح الشفت بنجاح' : 'Shift opened successfully'
          );
          this.router.navigate(['/shift/active']);
        } else {
          if (errorMsg && (errorMsg.includes('وردية نشطة') || errorMsg.includes('already') || errorMsg.includes('active'))) {
            this.shiftService.fetchCurrentShiftFromApi();
            this.notification.info(
              this.isArabic()
                ? 'توجد بالفعل وردية نشطة مفتوحة في النظام، جاري تحويلك إليها...'
                : 'An active shift is already open, redirecting...'
            );
            setTimeout(() => {
              this.router.navigate(['/shift/active']);
            }, 1000);
            return;
          }

          this.notification.error(
            errorMsg || (this.isArabic() ? 'فشل فتح الشفت' : 'Failed to start shift')
          );
        }
      }
    );
  }

  cancel(): void {
    if (this.hasActiveShift()) {
      this.router.navigate(['/shift/active']);
    } else {
      this.router.navigate(['/shift/history']);
    }
  }
}
