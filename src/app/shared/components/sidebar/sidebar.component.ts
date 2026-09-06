import { Component, input, output, inject, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ShiftService } from '../../../core/services/shift.service';
import { LanguageService } from '../../../core/services/language.service';
import { EndOfShiftModalComponent } from '../end-of-shift-modal/end-of-shift-modal.component';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, EndOfShiftModalComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  private authService = inject(AuthService);
  private shiftService = inject(ShiftService);
  private langService = inject(LanguageService);
  private router = inject(Router);

  isOpen = input<boolean>(false);
  closeSidebar = output<void>();

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // Logout confirmation dialog state
  showLogoutConfirm = signal<boolean>(false);
  showEndOfShiftModal = signal<boolean>(false);

  // Map of open accordion groups
  openMenus = signal<Record<string, boolean>>({
    workspace: false,
    classroom: false,
    package: false,
    shift: false,
    details: false,
    catering: false,
    settings: false,
  });

  ngOnInit(): void {
    this.autoExpandActiveMenu(this.router.url);
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.autoExpandActiveMenu(event.urlAfterRedirects || event.url);
    });
  }

  private autoExpandActiveMenu(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const segments = cleanUrl.split('/').filter(Boolean);
    if (segments.length > 0) {
      const group = segments[0];
      if (group in this.openMenus()) {
        this.openMenus.set({
          workspace: false,
          classroom: false,
          package: false,
          shift: false,
          details: false,
          catering: false,
          settings: false,
          [group]: true
        });
      }
    }
  }

  toggleMenu(menu: string): void {
    const isCurrentlyOpen = !!this.openMenus()[menu];
    this.openMenus.set({
      workspace: false,
      classroom: false,
      package: false,
      shift: false,
      details: false,
      catering: false,
      settings: false,
      [menu]: !isCurrentlyOpen
    });
  }

  isMenuOpen(menu: string): boolean {
    return !!this.openMenus()[menu];
  }

  logout(): void {
    // If there's an active shift, show the confirmation dialog
    if (this.shiftService.hasActiveShift()) {
      this.showLogoutConfirm.set(true);
      return;
    }

    // No active shift -> logout directly
    this.performLogout();
  }

  /** Trigger end of shift balance modal */
  closeShiftAndLogout(): void {
    this.showLogoutConfirm.set(false);
    this.showEndOfShiftModal.set(true);
  }

  /** After end of shift modal completes reconciliation, perform logout */
  onEndOfShiftCompleted(): void {
    this.showEndOfShiftModal.set(false);
    this.performLogout();
  }

  /** Dismiss end of shift modal */
  cancelEndOfShiftModal(): void {
    this.showEndOfShiftModal.set(false);
  }

  /** Logout without closing the shift */
  logoutOnly(): void {
    this.showLogoutConfirm.set(false);
    this.performLogout();
  }

  /** Dismiss the logout confirmation dialog */
  dismissLogoutConfirm(): void {
    this.showLogoutConfirm.set(false);
  }

  private performLogout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}


