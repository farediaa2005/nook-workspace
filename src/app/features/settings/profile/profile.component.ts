import { Component, inject, signal, computed, ChangeDetectorRef, OnInit } from '@angular/core';
import { ActiveSessionsComponent } from './active-sessions/active-sessions.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileApiService } from '../../../core/services/api/profile.service';
import { ChangePasswordDto, ProfileDto } from '../../../core/models/profile.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ActiveSessionsComponent,
    CommonModule,
    FormsModule,
    PageHeaderComponent, PrimaryButtonComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  private langService = inject(LanguageService);
  private authService = inject(AuthService);
  private profileApiService = inject(ProfileApiService);
  private cdr = inject(ChangeDetectorRef);

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  currentUser = this.authService.user;

  // --- Profile Form State (In-Memory Signals - NO LocalStorage) ---
  isLoadingProfile = signal<boolean>(true);
  profileFirstName = signal<string>('');
  profileLastName = signal<string>('');
  profileEmail = signal<string>('');
  profilePhone = signal<string>('');
  isEditingProfile = signal<boolean>(false);
  profileSaveSuccess = signal<boolean>(false);
  profileSaveError = signal<string | null>(null);

  // Security / Password State (In-Memory Signals - NO LocalStorage)
  currentPassword = signal<string>('');
  newPassword = signal<string>('');
  confirmPassword = signal<string>('');
  securityError = signal<string | null>(null);
  securitySuccess = signal<string | null>(null);
  isUpdatingPassword = signal<boolean>(false);

profileFullName = computed(() => {
    const first = this.profileFirstName().trim();
    const last = this.profileLastName().trim();
    if (first || last) {
      return `${first} ${last}`.trim();
    }
    return this.currentUser()?.name || 'User';
  });

  userAvatarUrl = computed(() => {
    const user = this.currentUser();
    if (user?.avatar) return user.avatar;
    const name = this.profileFullName();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f5b921&color=16130a&bold=true`;
  });

  userRoleTitle = computed(() => {
    const user = this.currentUser();
    if (user?.role === 'admin') {
      return this.t().systemAdministratorBadge || (this.t().systemAdministratorBadge);
    }
    return this.t().setStaffMember;
  });

  ngOnInit(): void {
    this.loadProfileFromBackend();
  }

  /**
   * Fetch current user and profile data from Backend API:
   * 1. GET /api/Auth/me
   * 2. GET /api/Accounts/{id}/profile
   */
  private loadProfileFromBackend(): void {
    this.isLoadingProfile.set(true);

    this.authService.fetchCurrentUser().subscribe({
      next: (me) => {
        const id = me?.id || me?.accountId || this.currentUser()?.id || '';

        if (id) {
          this.profileApiService.getProfile(id).subscribe({
            next: (profile) => {
              this.applyProfileData(profile, me);
              this.isLoadingProfile.set(false);
            },
            error: () => {
              // Fallback to Auth/me data
              this.applyProfileData(null, me);
              this.isLoadingProfile.set(false);
            }
          });
        } else {
          this.applyProfileData(null, me);
          this.isLoadingProfile.set(false);
        }
      },
      error: () => {
        const existing = this.currentUser();
        if (existing?.id) {
          this.profileApiService.getProfile(existing.id).subscribe({
            next: (profile) => {
              this.applyProfileData(profile, null);
              this.isLoadingProfile.set(false);
            },
            error: () => {
              this.isLoadingProfile.set(false);
            }
          });
        } else {
          this.isLoadingProfile.set(false);
        }
      }
    });
  }

  private applyProfileData(profile: ProfileDto | any, me: any): void {
    const name = profile?.firstName || profile?.username || me?.username || this.currentUser()?.name || '';
    const email = profile?.email || me?.email || this.currentUser()?.email || '';
    const phone = profile?.phoneNumber || me?.phoneNumber || '';

    if (profile?.firstName || profile?.lastName) {
      this.profileFirstName.set(profile.firstName || '');
      this.profileLastName.set(profile.lastName || '');
    } else if (name) {
      const parts = name.trim().split(/[\s_.]+/);
      if (parts.length > 1) {
        this.profileFirstName.set(parts[0]);
        this.profileLastName.set(parts.slice(1).join(' '));
      } else {
        this.profileFirstName.set(parts[0] || '');
        this.profileLastName.set('');
      }
    }

    this.profileEmail.set(email);
    this.profilePhone.set(phone);
  }

  // --- Profile & Security Action Handlers ---
  toggleEditProfile(): void {
    if (this.isEditingProfile()) {
      this.loadProfileFromBackend();
      this.isEditingProfile.set(false);
      this.profileSaveError.set(null);
    } else {
      this.isEditingProfile.set(true);
      this.profileSaveSuccess.set(false);
      this.profileSaveError.set(null);
    }
  }

  /**
   * Save Profile changes via Backend API:
   * PUT /api/Accounts/{id}
   */
  saveProfile(): void {
    const accountId = this.currentUser()?.id || '';
    if (!accountId) {
      this.isEditingProfile.set(false);
      return;
    }

    this.profileSaveError.set(null);
    this.profileSaveSuccess.set(false);

    const first = this.profileFirstName().trim();
    const last = this.profileLastName().trim();
    const combinedName = last ? `${first}_${last}` : first;

    const payload = {
      username: combinedName || undefined,
      email: this.profileEmail().trim() || undefined,
      phoneNumber: this.profilePhone().trim() || undefined,
      isActive: true
    };

    this.profileApiService.updateProfile(accountId, payload as any).subscribe({
      next: () => {
        // Re-fetch confirmed profile from backend API
        this.loadProfileFromBackend();
        this.isEditingProfile.set(false);
        this.profileSaveSuccess.set(true);
        setTimeout(() => this.profileSaveSuccess.set(false), 4000);
      },
      error: (err) => {
        const message = err?.error?.message || err?.message || (
          this.t().setFailedToSaveProfilePlease
        );
        this.profileSaveError.set(message);
      }
    });
  }

  /**
   * Change Password via Backend API:
   * PUT /api/Auth/change-password
   */
  updatePassword(): void {
    this.securityError.set(null);
    this.securitySuccess.set(null);

    const current = this.currentPassword();
    const next = this.newPassword();
    const confirm = this.confirmPassword();

    if (!current) {
      this.securityError.set(
        this.t().setCurrentPasswordIsRequired
      );
      return;
    }

    if (!next || next.length < 6) {
      this.securityError.set(
        this.t().setNewPasswordMustBeAt
      );
      return;
    }

    if (next !== confirm) {
      this.securityError.set(
        this.t().setNewPasswordAndConfirmationDo
      );
      return;
    }

    const payload: ChangePasswordDto = {
      currentPassword: current,
      newPassword: next,
      confirmPassword: confirm
    };

    this.isUpdatingPassword.set(true);

    this.profileApiService.changePassword(payload).subscribe({
      next: () => {
        this.isUpdatingPassword.set(false);
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.securitySuccess.set(
          this.t().setPasswordUpdatedSuccessfully
        );
        setTimeout(() => this.securitySuccess.set(null), 4000);
      },
      error: (err) => {
        this.isUpdatingPassword.set(false);
        const errMsg = err?.error?.message || err?.message || (
          this.t().setPasswordUpdateFailedPleaseCheck
        );
        this.securityError.set(errMsg);
      }
    });
  }

  signOutSecurely(): void {
    this.authService.logout();
  }
}

