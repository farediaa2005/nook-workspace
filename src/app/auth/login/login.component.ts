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
  activeField = signal<'email' | 'password' | 'resetEmail' | 'resetToken' | 'newPassword' | 'confirmPassword' | null>(null);
  isDarkTheme = this.themeService.isDark;
  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  // Forgot / Reset Password flow state
  mode = signal<'login' | 'forgot' | 'otp' | 'reset'>('login');
  resetEmail = signal<string>('');
  resetToken = signal<string>('');
  newPassword = signal<string>('');
  confirmPassword = signal<string>('');

  togglePassword(): void {
    this.showPassword.update(val => !val);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onFocus(field: 'email' | 'password' | 'resetEmail' | 'resetToken' | 'newPassword' | 'confirmPassword'): void {
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
    return this.isEmailActive() || this.isPasswordActive() || this.mode() !== 'login';
  }

  onForgotPassword(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.resetEmail.set(this.email());
    this.mode.set('forgot');
  }

  backToLogin(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.mode.set('login');
  }

  onRequestReset(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    const em = this.resetEmail().trim();

    if (!em) {
      this.errorMessage.set(this.isArabic() ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter your email address');
      return;
    }

    this.isLoading.set(true);
    this.authService.forgotPassword(em).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res?.message || (this.isArabic() ? 'تم إرسال كود التحقق (OTP) إلى بريدك الإلكتروني.' : 'Verification code (OTP) has been sent to your email.'));
        this.resetToken.set('');
        this.mode.set('otp');
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.message || err?.error?.title || (this.isArabic() ? 'فشل طلب كود التحقق' : 'Failed to request verification code');
        this.errorMessage.set(msg);
      }
    });
  }

  onVerifyOtpSubmit(): void {
    this.errorMessage.set('');
    const tok = this.resetToken().trim();
    if (!tok) {
      this.errorMessage.set(this.isArabic() ? 'يرجى إدخال كود التحقق (OTP)' : 'Please enter the verification code (OTP)');
      return;
    }
    this.errorMessage.set('');
    this.successMessage.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.mode.set('reset');
  }

  onResetPasswordSubmit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    const em = this.resetEmail().trim();
    const tok = this.resetToken().trim();
    const np = this.newPassword().trim();
    const cp = this.confirmPassword().trim();

    if (!tok) {
      this.errorMessage.set(this.isArabic() ? 'كود التحقق مفقود، يرجى الرجوع للخطوة السابقة' : 'Verification code is missing, please go back');
      this.mode.set('otp');
      return;
    }

    if (!np || !cp) {
      this.errorMessage.set(this.isArabic() ? 'يرجى إدخال كلمة المرور الجديدة وتأكيدها' : 'Please enter and confirm your new password');
      return;
    }

    if (np.length < 6) {
      this.errorMessage.set(this.isArabic() ? 'كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام' : 'Password must be at least 6 characters');
      return;
    }

    if (np !== cp) {
      this.errorMessage.set(this.isArabic() ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    this.isLoading.set(true);
    this.authService.resetPassword({ email: em, token: tok, newPassword: np }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set(this.isArabic() ? 'تم تغيير كلمة المرور بنجاح! يمكنك تسجيل الدخول الآن.' : 'Password reset successfully! You can now log in.');
        this.email.set(em);
        this.password.set('');
        this.mode.set('login');
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.message || err?.error?.title || (this.isArabic() ? 'فشل إعادة تعيين كلمة المرور، يرجى التأكد من كود الـ OTP' : 'Failed to reset password, please verify OTP');
        this.errorMessage.set(msg);
      }
    });
  }

  onSubmit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
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

