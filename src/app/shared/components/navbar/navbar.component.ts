import {
  Component,
  output,
  inject,
  computed,
  signal,
  HostListener,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { ThemeService } from '../../../core/services/theme.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { ClassroomService } from '../../../core/services/classroom.service';
import { CateringService } from '../../../core/services/catering.service';
import { getUserInitials, getSafeAvatar } from '../../../core/utils/avatar.util';

export interface QuickSearchItem {
  id: string;
  category: 'students' | 'rooms' | 'products' | 'pages';
  title: string;
  subtitle: string;
  badge?: string;
  badgeType?: 'active' | 'success' | 'warning' | 'info' | 'neutral';
  icon: 'student' | 'room' | 'product' | 'page' | 'checkin' | 'shift' | 'package' | 'settings' | 'dashboard';
  route: string;
  queryParams?: Record<string, string>;
}

export interface QuickSearchGroup {
  key: string;
  label: string;
  items: QuickSearchItem[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  private authService = inject(AuthService);
  private langService = inject(LanguageService);
  private themeService = inject(ThemeService);
  private workspaceService = inject(WorkspaceService);
  private classroomService = inject(ClassroomService);
  private cateringService = inject(CateringService);
  private router = inject(Router);

  toggleSidebar = output<void>();

  currentUser = this.authService.user;
  isDarkTheme = this.themeService.isDark;

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  userName = computed(() => this.currentUser()?.name || (this.isArabic() ? 'مستخدم' : 'User'));

  userRoleTitle = computed(() => {
    const user = this.currentUser();
    if (user?.role === 'admin') {
      return this.t().systemAdmin || 'System Admin';
    }
    return this.t().receptionCashierRole || 'Receptionist';
  });

  userInitials = computed(() => getUserInitials(this.userName()));

  userAvatar = computed(() => {
    const user = this.currentUser();
    return getSafeAvatar(user?.avatar, this.userName());
  });

  // ==========================================
  // UNIVERSAL SEARCH STATE & LOGIC
  // ==========================================
  searchQuery = signal<string>('');
  isDropdownOpen = signal<boolean>(false);
  selectedIndex = signal<number>(-1);

  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('searchContainer') searchContainerRef?: ElementRef<HTMLElement>;

  private getSystemPages(): {
    titleAr: string;
    titleEn: string;
    subtitleAr: string;
    subtitleEn: string;
    route: string;
    queryParams?: Record<string, string>;
    icon: QuickSearchItem['icon'];
    keywords: string[];
  }[] {
    return [
      {
        titleAr: 'تسجيل دخول طالب جديد',
        titleEn: 'Check-in Student',
        subtitleAr: 'مساحة العمل • تسجيل فوري',
        subtitleEn: 'Workspace • Fast Check-in',
        route: '/workspace/show-student',
        queryParams: { openCheckIn: 'true' },
        icon: 'checkin',
        keywords: ['دخول', 'تسجيل', 'checkin', 'check-in', 'طالب', 'student', 'جلسة', 'حضور']
      },
      {
        titleAr: 'جلسات الطلاب الحالية',
        titleEn: 'Active Student Sessions',
        subtitleAr: 'مساحة العمل • الطلاب الحاضرين',
        subtitleEn: 'Workspace • Seated Students',
        route: '/workspace/show-student',
        icon: 'student',
        keywords: ['طلاب', 'جلسات', 'طالب', 'students', 'workspace', 'session']
      },
      {
        titleAr: 'القاعات وحجوزات الورش',
        titleEn: 'Classrooms & Bookings',
        subtitleAr: 'القاعات • إدارة الحجوزات والمحاضرين',
        subtitleEn: 'Classrooms • Live Board',
        route: '/classroom/show-classroom',
        icon: 'room',
        keywords: ['قاعات', 'قاعة', 'غرف', 'غرفة', 'محاضرة', 'ورشة', 'rooms', 'classrooms']
      },
      {
        titleAr: 'الوردية الحالية والخزينة',
        titleEn: 'Active Cashier Shift',
        subtitleAr: 'الورديات • المعاملات النقدية والخزينة',
        subtitleEn: 'Shifts • Cash register & Ledger',
        route: '/shift/active-shift',
        icon: 'shift',
        keywords: ['وردية', 'شيفت', 'خزينة', 'كاشير', 'فلوس', 'shift', 'active', 'cash']
      },
      {
        titleAr: 'سجل الورديات السابقة',
        titleEn: 'Shift History & Archive',
        subtitleAr: 'الورديات • تقارير الورديات السابقة',
        subtitleEn: 'Shifts • Past records & Audit',
        route: '/shift/shift-history',
        icon: 'shift',
        keywords: ['سجل', 'ارشيف', 'ورديات', 'تقرير', 'history', 'archive']
      },
      {
        titleAr: 'باقات واشتراكات الطلاب',
        titleEn: 'Student Packages',
        subtitleAr: 'الباقات • باقات وساعات الطلاب',
        subtitleEn: 'Packages • Student hours & plans',
        route: '/package/show-student-package',
        icon: 'package',
        keywords: ['باقة', 'باقات', 'اشتراك', 'ساعات', 'package', 'packages', 'student']
      },
      {
        titleAr: 'باقات المحاضرين والمدربين',
        titleEn: 'Instructor Packages',
        subtitleAr: 'الباقات • باقات وساعات المحاضرين',
        subtitleEn: 'Packages • Instructor packages',
        route: '/package/show-instructor-package',
        icon: 'package',
        keywords: ['محاضر', 'محاضرين', 'مدرب', 'instructor', 'packages']
      },
      {
        titleAr: 'الكانتين والمنتجات (POS)',
        titleEn: 'Catering & Products (POS)',
        subtitleAr: 'الكانتين • المبيعات والمشروبات والمخزون',
        subtitleEn: 'Catering • Products & Inventory',
        route: '/catering/show-products',
        icon: 'product',
        keywords: ['كانتين', 'كاترنج', 'منتجات', 'مشروبات', 'سناكس', 'pos', 'catering', 'coffee', 'snacks']
      },
      {
        titleAr: 'دليل الكليات والجامعات',
        titleEn: 'Colleges & Universities',
        subtitleAr: 'البيانات • الكليات والجامعات',
        subtitleEn: 'Directory • Universities',
        route: '/details/show-colleges',
        icon: 'page',
        keywords: ['كلية', 'كليات', 'جامعة', 'جامعات', 'college', 'faculty', 'university']
      },
      {
        titleAr: 'قائمة الحظر (Blacklist)',
        titleEn: 'Blacklist Directory',
        subtitleAr: 'الأمان • الطلاب المحظورين',
        subtitleEn: 'Security • Blocked records',
        route: '/details/show-blacklist',
        icon: 'page',
        keywords: ['حظر', 'محظور', 'بلاك لست', 'blacklist', 'blocked']
      },
      {
        titleAr: 'أكواد الخصم والعروض الترويجية',
        titleEn: 'Discounts & Promo Codes',
        subtitleAr: 'الإعدادات • الخصومات الفعالة',
        subtitleEn: 'Settings • Active discounts',
        route: '/settings/discounts',
        icon: 'page',
        keywords: ['خصم', 'خصومات', 'عروض', 'discount', 'discounts', 'offers', 'كوبون', 'برومو']
      },
      {
        titleAr: 'لوحة التحكم والتحليلات',
        titleEn: 'Analytics Dashboard',
        subtitleAr: 'الإحصائيات • الإيرادات والمؤشرات',
        subtitleEn: 'Analytics • Revenue & KPI',
        route: '/dashboard',
        icon: 'dashboard',
        keywords: ['لوحة', 'تحكم', 'احصائيات', 'تقارير', 'dashboard', 'analytics', 'kpi']
      },
      {
        titleAr: 'إعدادات النظام العامة',
        titleEn: 'System Settings',
        subtitleAr: 'الإعدادات • الأسعار والصلاحيات',
        subtitleEn: 'Settings • Rates & preferences',
        route: '/settings',
        icon: 'settings',
        keywords: ['اعدادات', 'ضبط', 'اسعار', 'settings', 'config']
      }
    ];
  }

  readonly groupedResults = computed<QuickSearchGroup[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const ar = this.isArabic();
    const groups: QuickSearchGroup[] = [];

    // 1. Students (الطلاب)
    if (q) {
      const studentItems: QuickSearchItem[] = [];
      const seenIds = new Set<string>();

      // Active Seated Students
      for (const s of this.workspaceService.activeStudents()) {
        const text = `${s.name} ${s.phone || ''} ${s.studentId || ''} ${s.college || ''} ${s.faculty || ''}`.toLowerCase();
        if (text.includes(q)) {
          seenIds.add(s.id);
          studentItems.push({
            id: 'st_act_' + s.id,
            category: 'students',
            title: s.name,
            subtitle: `${s.phone ? s.phone + ' • ' : ''}${s.roomName || (ar ? 'مساحة العمل' : 'Workspace')} • ${s.duration || ''}`,
            badge: ar ? 'نشط الآن' : 'Active',
            badgeType: 'active',
            icon: 'student',
            route: '/workspace/show-student',
            queryParams: { search: s.phone || s.name }
          });
          if (studentItems.length >= 4) break;
        }
      }

      // Backend Directory Students
      if (studentItems.length < 5) {
        for (const s of this.workspaceService.backendStudents()) {
          if (s.id && seenIds.has(s.id)) continue;
          const text = `${s.name} ${s.phone || ''} ${s.college || ''} ${s.faculty || ''}`.toLowerCase();
          if (text.includes(q)) {
            studentItems.push({
              id: 'st_dir_' + (s.id || s.phone),
              category: 'students',
              title: s.name,
              subtitle: `${s.phone ? s.phone + ' • ' : ''}${s.college || s.faculty || (ar ? 'طالب مسجل' : 'Registered')}`,
              badge: ar ? 'دليل الطلاب' : 'Directory',
              badgeType: 'neutral',
              icon: 'student',
              route: '/workspace/show-student',
              queryParams: { search: s.phone || s.name }
            });
            if (studentItems.length >= 5) break;
          }
        }
      }

      if (studentItems.length > 0) {
        groups.push({
          key: 'students',
          label: ar ? 'الطلاب والجلسات' : 'Students & Sessions',
          items: studentItems
        });
      }
    }

    // 2. Classrooms & Rooms (القاعات)
    if (q) {
      const roomItems: QuickSearchItem[] = [];
      const rooms = this.classroomService.rooms();
      const cards = this.classroomService.cards();

      for (const r of rooms) {
        const text = `${r.name} ${r.nameAr || ''}`.toLowerCase();
        if (text.includes(q)) {
          const card = cards.find(c => c.roomId === r.id || c.name.toLowerCase() === r.name.toLowerCase());
          const isActive = card?.status === 'active';
          roomItems.push({
            id: 'room_' + r.id,
            category: 'rooms',
            title: ar ? (r.nameAr || r.name) : r.name,
            subtitle: `${r.capacity ? (ar ? `سعة ${r.capacity} فرد • ` : `Cap. ${r.capacity} • `) : ''}${card?.instructor ? card.instructor : (ar ? 'متاح للحجز' : 'Available')}`,
            badge: isActive ? (ar ? 'مشغول' : 'Occupied') : (ar ? 'متاح' : 'Available'),
            badgeType: isActive ? 'warning' : 'success',
            icon: 'room',
            route: '/classroom/show-classroom'
          });
          if (roomItems.length >= 3) break;
        }
      }

      if (roomItems.length > 0) {
        groups.push({
          key: 'rooms',
          label: ar ? 'القاعات والمساحات' : 'Rooms & Classrooms',
          items: roomItems
        });
      }
    }

    // 3. Catering / Products (الكانتين)
    if (q) {
      const productItems: QuickSearchItem[] = [];
      for (const p of this.cateringService.products()) {
        const text = `${p.name} ${p.nameAr || ''} ${p.category || ''} ${p.categoryAr || ''} ${p.barcode || ''}`.toLowerCase();
        if (text.includes(q)) {
          productItems.push({
            id: 'prod_' + p.id,
            category: 'products',
            title: ar ? (p.nameAr || p.name) : p.name,
            subtitle: `${p.sellingPrice} ${ar ? 'ج.م' : 'EGP'} • ${ar ? `المخزون: ${p.stock}` : `Stock: ${p.stock}`}`,
            badge: p.stock > 0 ? (ar ? 'متوفر' : 'In Stock') : (ar ? 'نفد' : 'Out of Stock'),
            badgeType: p.stock > 0 ? 'success' : 'warning',
            icon: 'product',
            route: '/catering/show-products',
            queryParams: { search: p.nameAr || p.name }
          });
          if (productItems.length >= 4) break;
        }
      }

      if (productItems.length > 0) {
        groups.push({
          key: 'products',
          label: ar ? 'الكانتين والمنتجات' : 'Catering & Products',
          items: productItems
        });
      }
    }

    // 4. Pages & Shortcuts (الصفحات والوصول السريع)
    const pages = this.getSystemPages();
    const pageItems: QuickSearchItem[] = [];

    if (!q) {
      // Default quick navigation recommendations when empty
      for (const p of pages.slice(0, 8)) {
        pageItems.push({
          id: 'page_' + p.route + (p.queryParams?.['openCheckIn'] || ''),
          category: 'pages',
          title: ar ? p.titleAr : p.titleEn,
          subtitle: ar ? p.subtitleAr : p.subtitleEn,
          icon: p.icon,
          route: p.route,
          queryParams: p.queryParams
        });
      }
    } else {
      for (const p of pages) {
        const text = `${p.titleAr} ${p.titleEn} ${p.subtitleAr} ${p.subtitleEn} ${p.keywords.join(' ')}`.toLowerCase();
        if (text.includes(q)) {
          pageItems.push({
            id: 'page_' + p.route + (p.queryParams?.['openCheckIn'] || ''),
            category: 'pages',
            title: ar ? p.titleAr : p.titleEn,
            subtitle: ar ? p.subtitleAr : p.subtitleEn,
            icon: p.icon,
            route: p.route,
            queryParams: p.queryParams
          });
          if (pageItems.length >= 4) break;
        }
      }
    }

    if (pageItems.length > 0) {
      groups.push({
        key: 'pages',
        label: q ? (ar ? 'الصفحات والإجراءات' : 'Pages & Actions') : (ar ? 'الوصول السريع' : 'Quick Navigation'),
        items: pageItems
      });
    }

    return groups;
  });

  readonly flatResults = computed<QuickSearchItem[]>(() =>
    this.groupedResults().flatMap(g => g.items)
  );

  openSearch(): void {
    this.isDropdownOpen.set(true);
    this.selectedIndex.set(-1);
    setTimeout(() => {
      this.searchInputRef?.nativeElement.focus();
    }, 50);
  }

  onInputFocus(): void {
    this.isDropdownOpen.set(true);
    this.selectedIndex.set(-1);
  }

  onSearchInput(val: string): void {
    this.searchQuery.set(val);
    this.isDropdownOpen.set(true);
    this.selectedIndex.set(-1);
  }

  clearSearch(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.searchQuery.set('');
    this.selectedIndex.set(-1);
    this.searchInputRef?.nativeElement.focus();
  }

  selectItem(item: QuickSearchItem): void {
    this.isDropdownOpen.set(false);
    this.searchQuery.set('');
    this.selectedIndex.set(-1);
    this.router.navigate([item.route], { queryParams: item.queryParams });
  }

  onItemHover(itemId: string): void {
    const idx = this.flatResults().findIndex(it => it.id === itemId);
    if (idx >= 0) {
      this.selectedIndex.set(idx);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    const list = this.flatResults();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.isDropdownOpen()) {
        this.isDropdownOpen.set(true);
        this.selectedIndex.set(0);
      } else {
        this.selectedIndex.update(i => (i < list.length - 1 ? i + 1 : 0));
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.isDropdownOpen()) {
        this.isDropdownOpen.set(true);
        this.selectedIndex.set(list.length - 1);
      } else {
        this.selectedIndex.update(i => (i > 0 ? i - 1 : list.length - 1));
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const currentIdx = this.selectedIndex();
      if (currentIdx >= 0 && currentIdx < list.length) {
        this.selectItem(list[currentIdx]);
      } else if (list.length > 0) {
        this.selectItem(list[0]);
      } else if (this.searchQuery().trim()) {
        const query = this.searchQuery().trim();
        this.isDropdownOpen.set(false);
        this.searchQuery.set('');
        this.router.navigate(['/workspace/show-student'], { queryParams: { search: query } });
      }
    } else if (event.key === 'Escape') {
      this.isDropdownOpen.set(false);
      this.searchInputRef?.nativeElement.blur();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeyDown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.openSearch();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (this.searchContainerRef && !this.searchContainerRef.nativeElement.contains(e.target as Node)) {
      this.isDropdownOpen.set(false);
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleLanguage(): void {
    this.langService.toggleLanguage();
  }
}
