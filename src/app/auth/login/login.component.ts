import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ShiftService } from '../../core/services/shift.service';
import { ThemeService } from '../../core/services/theme.service';
import { ClassroomService } from '../../core/services/classroom.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { PackageService } from '../../core/services/package.service';
import { SettingsService } from '../../core/services/settings.service';
import { CateringService } from '../../core/services/catering.service';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private shiftService = inject(ShiftService);
  private classroomService = inject(ClassroomService);
  private workspaceService = inject(WorkspaceService);
  private packageService = inject(PackageService);
  private settingsService = inject(SettingsService);
  private cateringService = inject(CateringService);
  private router = inject(Router);
  private themeService = inject(ThemeService);
  private languageService = inject(LanguageService);

  isArabic = this.languageService.isArabic;
  t = this.languageService.t;

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }

  email = signal<string>('');
  password = signal<string>('');
  showPassword = signal<boolean>(false);
  activeField = signal<'email' | 'password' | null>(null);
  isDarkTheme = this.themeService.isDark;
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  togglePassword(): void {
    this.showPassword.update(val => !val);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onFocus(field: 'email' | 'password'): void {
    this.activeField.set(field);
  }

  onBlur(): void {
    this.activeField.set(null);
  }

  isEmailActive(): boolean {
    return this.activeField() === 'email' || this.email().trim().length > 0;
  }

  isPasswordActive(): boolean {
    return this.activeField() === 'password' || this.password().length > 0;
  }

  isLampOn(): boolean {
    return this.isEmailActive() || this.isPasswordActive();
  }

  onForgotPassword(): void {
    const contactMsg = this.isArabic()
      ? 'لاستعادة أو إعادة تعيين كلمة المرور، يرجى التواصل مع مسؤول النظام (System Administrator).'
      : 'To reset or recover your password, please contact the System Administrator.';
    this.errorMessage.set(contactMsg);
  }

  onSubmit(): void {
    this.errorMessage.set('');
    const id = this.email().trim();
    const pw = this.password().trim();

    if (!id || !pw) {
      this.errorMessage.set(this.t().loginValidationRequired);
      return;
    }

    this.isLoading.set(true);

    this.authService.login({ identifier: id, password: pw }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.shiftService.fetchCurrentShiftFromApi();
        this.settingsService.syncRoomsFromBackend();
        this.settingsService.syncPricingPlansFromBackend();
        this.settingsService.syncPackagePricingPlansFromBackend();
        this.classroomService.syncWithBackend();
        this.workspaceService.loadFromBackend();
        this.packageService.syncPackagesFromBackend();
        this.cateringService.syncWithBackend();
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('[Login Error]', err);
        let msg = this.t().loginInvalidCredentials;
        if (err.status === 0) {
          msg = this.t().loginNetworkError;
        } else if (err?.error?.message) {
          msg = err.error.message;
        } else if (err?.error?.errors && Array.isArray(err.error.errors) && err.error.errors.length > 0) {
          msg = err.error.errors.join(' ');
        } else if (typeof err?.error === 'string') {
          msg = err.error;
        }
        this.errorMessage.set(msg);
      }
    });
  }
}

