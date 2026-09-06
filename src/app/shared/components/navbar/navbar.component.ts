import { Component, output, inject, computed } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { ThemeService } from '../../../core/services/theme.service';
import { getUserInitials, getSafeAvatar } from '../../../core/utils/avatar.util';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  private authService = inject(AuthService);
  private langService = inject(LanguageService);
  private themeService = inject(ThemeService);

  toggleSidebar = output<void>();

  currentUser = this.authService.user;
  isDarkTheme = this.themeService.isDark;

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  userName = computed(() => this.currentUser()?.name || (this.isArabic() ? 'مستخدم' : 'User'));
  
  userRoleTitle = computed(() => {
    const user = this.currentUser();
    if (user?.role === 'admin') {
      return this.isArabic() ? 'مدير النظام' : 'System Admin';
    }
    return this.isArabic() ? 'موظف الاستقبال' : 'Receptionist';
  });

  userInitials = computed(() => getUserInitials(this.userName()));
  
  userAvatar = computed(() => {
    const user = this.currentUser();
    return getSafeAvatar(user?.avatar, this.userName());
  });

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleLanguage(): void {
    this.langService.toggleLanguage();
  }
}
