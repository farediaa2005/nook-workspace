import { Component, signal, computed, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ShiftService } from '../../core/services/shift.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { getSafeAvatar } from '../../core/utils/avatar.util';

@Component({
  selector: 'app-main-layout',
  imports: [CommonModule, FormsModule, RouterOutlet, SidebarComponent, NavbarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent implements OnInit {
  private shiftService = inject(ShiftService);
  private authService = inject(AuthService);
  private langService = inject(LanguageService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  isSidebarOpen = signal<boolean>(false);
  currentUrl = signal<string>(this.router.url);

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  currencyText = computed(() => this.isArabic() ? 'ج.م' : 'EGP');

  // Check if an active shift exists
  hasActiveShift = this.shiftService.hasActiveShift;
  isViewOnly = this.shiftService.isViewOnly;
  userBypassedShift = signal<boolean>(false);

  goToOpenShift(): void {
    this.router.navigate(['/shift/add-shift']);
  }

  // Show open shift modal if no active shift, unless currently on shift history or user is Admin (Item 42)
  shouldShowOpenShiftModal = computed(() => {
    if (this.hasActiveShift()) return false;
    if (this.userBypassedShift()) return false;
    const url = this.currentUrl();
    if (url.includes('/shift/history') || url.includes('/shift/add-shift')) return false;
    if (this.user()?.role === 'admin') return false;
    return true;
  });

  bypassShiftModal(): void {
    this.userBypassedShift.set(true);
  }

  // User identity signals
  readonly user = this.authService.user;
  readonly staffName = computed(() => this.user()?.name || (this.isArabic() ? 'موظف الاستقبال' : 'Staff Member'));
  readonly staffRole = computed(() => {
    const role = this.user()?.role;
    if (role === 'admin') return this.isArabic() ? 'مدير النظام' : 'Admin';
    return this.isArabic() ? 'موظف الاستقبال' : 'Receptionist';
  });
  readonly staffAvatar = computed(() => 
    getSafeAvatar(this.user()?.avatar, this.staffName())
  );

  ngOnInit(): void {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((event: NavigationEnd) => {
      this.currentUrl.set(event.urlAfterRedirects || event.url);
    });
  }

  // Formatted date
  formattedDate = computed(() => {
    const d = new Date();
    return d.toLocaleDateString(this.isArabic() ? 'ar-EG' : 'en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  });

  // Formatted time
  formattedTime = computed(() => {
    const d = new Date();
    return d.toLocaleTimeString(this.isArabic() ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  });

  // 4 Payment Channels Starting Inputs
  startCash = signal<number | string>('');
  startVodafone = signal<number | string>('');
  startInstaPay = signal<number | string>('');
  startFawry = signal<number | string>('');
  notes = signal<string>('');
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  toggleSidebar(): void {
    this.isSidebarOpen.update(val => !val);
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  /**
   * Start Shift from Modal with 4 channel floats
   */
  onStartShift(): void {
    this.errorMessage.set('');

    const cash = Number(this.startCash());
    if (this.startCash() === '' || isNaN(cash) || cash < 0) {
      this.errorMessage.set(
        this.isArabic()
          ? 'يرجى إدخال مبلغ نقدية الخزينة الافتتاحية بشكل صحيح'
          : 'Starting cash amount must be a valid positive number'
      );
      return;
    }

    const user = this.authService.getUser();
    if (!user) {
      this.onLogout();
      return;
    }

    this.isSubmitting.set(true);

    const vf = Number(this.startVodafone()) || 0;
    const ip = Number(this.startInstaPay()) || 0;
    const fw = Number(this.startFawry()) || 0;

    if (vf < 0 || ip < 0 || fw < 0) {
      this.errorMessage.set(
        this.isArabic()
          ? 'لا يمكن أن تكون أرصدة المحافظ الرقمية الافتتاحية سالبة'
          : 'Digital channel opening amounts cannot be negative'
      );
      return;
    }

    const noteText = this.notes().trim() || undefined;

    this.shiftService.startShift(cash, vf, ip, fw, noteText, (success, errorMsg) => {
      this.isSubmitting.set(false);
      if (success) {
        this.startCash.set('');
        this.startVodafone.set('');
        this.startInstaPay.set('');
        this.startFawry.set('');
        this.notes.set('');
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage.set(
          errorMsg || (this.isArabic() ? 'تعذر بدء الوردية، يرجى المحاولة مرة أخرى' : 'Failed to start shift, please try again')
        );
      }
    });
  }

  /**
   * If user cancels / exits without starting shift -> logout
   */
  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  clearError(): void {
    this.errorMessage.set('');
  }
}
