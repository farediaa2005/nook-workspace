import { Injectable, signal, computed } from '@angular/core';
import type { Lang, Translations } from '../i18n/translations';

export type { Lang, Translations };

/** Each language is its own chunk; only the one in use is downloaded. */
const LOADERS: Record<Lang, () => Promise<Translations>> = {
  en: () => import('../i18n/en').then((m) => m.dictionary.en),
  ar: () => import('../i18n/ar').then((m) => m.dictionary.ar),
};



@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  public static readonly LANG_KEY = 'nook_lang';

  private static getInitialLang(): Lang {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LanguageService.LANG_KEY);
        if (saved === 'ar' || saved === 'en') {
          return saved;
        }
      } catch {}
    }
    return 'ar';
  }

  readonly currentLang = signal<Lang>(LanguageService.getInitialLang());

  readonly isArabic = computed(() => this.currentLang() === 'ar');
  private readonly loaded = signal<Partial<Record<Lang, Translations>>>({});

  /** Texts of the current language. Until a language has loaded, the other one (or an empty set) is shown. */
  readonly t = computed<Translations>(() => {
    const d = this.loaded();
    return d[this.currentLang()] ?? d.ar ?? d.en ?? ({} as Translations);
  });

  /** Resolves when the current language's texts are in. The app waits for this before the first screen (app.config.ts). */
  readonly ready: Promise<void> = this.load(LanguageService.getInitialLang());

  private async load(lang: Lang): Promise<void> {
    if (this.loaded()[lang]) return;
    const dict = await LOADERS[lang]();
    this.loaded.update((d) => ({ ...d, [lang]: dict }));
  }

  /**
   * Translation with placeholders: tf('userCreated', { name: 'Sara' }) on "تم إنشاء حساب {name}" →
   * "تم إنشاء حساب Sara". An arrow property, so components can expose it as `tf = this.lang.tf`.
   */
  readonly tf = (key: keyof Translations, params: Record<string, string | number | null | undefined> = {}): string =>
    String(this.t()[key] ?? '').replace(/\{(\w+)\}/g, (m, name: string) => (params[name] ?? '').toString());

  /** Hours with Arabic number agreement: ساعة واحدة / ساعتان / 3–10 ساعات / 11+ (or fractions) ساعة. English: 1 hour / N hours. */
  readonly hoursText = (n: number): string =>
    n === 1 ? this.t().durHourOne
      : n === 2 ? this.t().durHourTwo
        : this.tf(n >= 3 && n <= 10 ? 'durHoursFew' : 'durHoursMany', { n });

  /** Hours and minutes: "ساعة و 20 دقيقة" / "1 hr 20 min"; whole hours use hoursText; minutes only: "45 دقيقة" / "45 min". */
  readonly hoursMinutesText = (h: number, m: number): string => {
    if (h === 0) return this.tf('durMinutes', { n: m });
    if (m === 0) return this.hoursText(h);
    const hours = h === 1 ? this.t().durHourShortOne
      : h === 2 ? this.t().durHourShortTwo
        : this.tf(h >= 3 && h <= 10 ? 'durHoursShortFew' : 'durHoursShortMany', { n: h });
    return hours + this.t().durAnd + this.tf('durMinutes', { n: m });
  };

  constructor() {
    // direction and lang attribute right away; the texts arrive with `ready`
    this.applyLanguage(this.currentLang());
  }

  /** Loads both languages (tests, or before a switch that must be instant). */
  async preloadAll(): Promise<void> {
    await Promise.all([this.load('ar'), this.load('en')]);
  }

  toggleLanguage(): void {
    const nextLang: Lang = this.currentLang() === 'en' ? 'ar' : 'en';
    this.setLanguage(nextLang);
  }

  setLanguage(lang: Lang): void {
    // switch at once if the texts are in; otherwise once they arrive, so the page never shows empty labels
    if (this.loaded()[lang]) this.applyLanguage(lang);
    else void this.load(lang).then(() => this.applyLanguage(lang));
  }

  private applyLanguage(lang: Lang): void {
    this.currentLang.set(lang);
    if (typeof window !== 'undefined') {
      const dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('dir', dir);
      document.documentElement.setAttribute('lang', lang);
      try {
        localStorage.setItem(LanguageService.LANG_KEY, lang);
      } catch {}
    }
  }

  formatNameLocale(name?: string): string {
    if (!name) return '';
    return name.trim();
  }

  formatTimeLocale(timeStr?: string | number): string {
    if (timeStr === undefined || timeStr === null || timeStr === '') return '';
    let str = String(timeStr).trim();
    // Normalize corrupted double markers
    str = str.replace(/\b(AM\s+PM|PM\s+AM|AM\s+AM|PM\s+PM)\b/gi, m => m.toUpperCase().startsWith('P') ? 'PM' : 'AM');
    str = str.replace(/(ص\s+م|م\s+ص|ص\s+ص|م\s+م)/g, m => m.startsWith('م') ? 'م' : 'ص');

    // Handle full ISO UTC strings (e.g. 2026-09-07T13:41:33.944)
    if (str.includes('T')) {
      const fullIso = str.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(str) ? str : str + 'Z';
      const d = new Date(fullIso);
      if (!isNaN(d.getTime())) {
        let h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, '0');
        const marker = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        const padH = String(h).padStart(2, '0');
        if (this.isArabic()) {
          const arMarker = marker === 'PM' ? 'م' : 'ص';
          return `${padH}:${m} ${arMarker}`;
        } else {
          return `${padH}:${m} ${marker}`;
        }
      }
    }

    const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|ص|م)?/i);
    if (match) {
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

      const padH = String(h).padStart(2, '0');
      if (this.isArabic()) {
        const arMarker = marker === 'PM' ? 'م' : 'ص';
        return `${padH}:${m} ${arMarker}`;
      } else {
        return `${padH}:${m} ${marker}`;
      }
    }
    return str;
  }

  formatDurationLocale(durStr?: string): string {
    if (!durStr) return this.isArabic() ? '0 س 00 د' : '0h 00m';
    const str = String(durStr).trim();
    if (!str || str === '-' || str === 'null' || str === 'undefined') {
      return this.isArabic() ? '0 س 00 د' : '0h 00m';
    }

    // Match days, hours, minutes from various patterns
    // e.g. "4d 18h 42m", "4 يوم 18 س 42 د", "114h 42m", "114 س 42 د", "0 س 01 د", "1:30"
    const dMatch = str.match(/(\d+)\s*(?:d|days?|day|يوم|أيام|ي)(?!\w)/i);
    const hMatch = str.match(/(\d+)\s*(?:h|hours?|hour|hrs?|ساعات|ساعة|س)(?!\w)/i);
    const mMatch = str.match(/(\d+)\s*(?:m|mins?|min|دقائق|دقيقة|د)(?!\w)/i);

    let colonMatch: RegExpMatchArray | null = null;
    if (!dMatch && !hMatch && !mMatch) {
      colonMatch = str.match(/^(\d{1,3}):(\d{1,2})$/);
    }

    if (!dMatch && !hMatch && !mMatch && !colonMatch) {
      return str;
    }

    const parsedDays = dMatch ? parseInt(dMatch[1], 10) : 0;
    let parsedHours = hMatch ? parseInt(hMatch[1], 10) : 0;
    let parsedMins = mMatch ? parseInt(mMatch[1], 10) : 0;

    if (colonMatch) {
      parsedHours = parseInt(colonMatch[1], 10);
      parsedMins = parseInt(colonMatch[2], 10);
    }

    const totalMinutes = parsedDays * 1440 + parsedHours * 60 + parsedMins;
    const finalDays = Math.floor(totalMinutes / 1440);
    const remMinutes = totalMinutes % 1440;
    const finalHours = Math.floor(remMinutes / 60);
    const finalMins = remMinutes % 60;
    const paddedMins = String(finalMins).padStart(2, '0');

    const isAr = this.isArabic();

    if (finalDays > 0) {
      if (isAr) {
        return `${finalDays} يوم ${finalHours} س ${paddedMins} د`;
      } else {
        return `${finalDays}d ${finalHours}h ${paddedMins}m`;
      }
    }

    // If finalDays === 0
    // Check if originally only minutes were provided
    if (!dMatch && !hMatch && !colonMatch && mMatch) {
      return isAr ? `${finalMins} د` : `${finalMins}m`;
    }
    // Check if originally only hours were provided
    if (!dMatch && !mMatch && !colonMatch && hMatch && finalMins === 0) {
      return isAr ? `${finalHours} س` : `${finalHours}h`;
    }

    if (isAr) {
      return `${finalHours} س ${paddedMins} د`;
    } else {
      return `${finalHours}h ${paddedMins}m`;
    }
  }

  formatActivityLocale(activity?: string): string {
    if (!activity) return '';
    const trimmed = activity.trim();
    if (this.isArabic()) {
      const actMap: Record<string, string> = {
        'web dev workshop': 'ورشة تطوير الويب',
        'fullstack web dev workshop': 'ورشة تطوير الويب الشامل',
        'ui design lab': 'معمل تصميم الواجهات (UI/UX)',
        'ui/ux design sprint': 'جلسة تصميم واجهات وتجربة مستخدم',
        'photography basics': 'أساسيات التصوير الفوتوغرافي',
        'graduation project discussion': 'مناقشة مشروع التخرج',
        'python for beginners': 'بايثون للمبتدئين',
        'english conversation club': 'نادي المحادثة الإنجليزية',
        'graphic design masterclass': 'دورة التصميم الجرافيكي',
        'flutter mobile dev': 'تطوير تطبيقات فلاتر',
        'general study': 'دراسة ومذاكرة عامة'
      };
      const lower = trimmed.toLowerCase();
      if (actMap[lower]) return actMap[lower];
      return trimmed;
    } else {
      const engActMap: Record<string, string> = {
        'ورشة تطوير الويب': 'Web Dev Workshop',
        'ورشة تطوير الويب الشامل': 'Fullstack Web Dev Workshop',
        'معمل تصميم الواجهات (UI/UX)': 'UI Design Lab',
        'جلسة تصميم واجهات وتجربة مستخدم': 'UI/UX Design Sprint',
        'أساسيات التصوير الفوتوغرافي': 'Photography Basics',
        'مناقشة مشروع التخرج': 'Graduation Project Discussion'
      };
      if (engActMap[trimmed]) return engActMap[trimmed];
      return trimmed;
    }
  }

  formatRoomLocale(room?: string): string {
    if (!room) return '';
    const trimmed = room.trim();
    if (this.isArabic()) {
      const roomMap: Record<string, string> = {
        'hall a (main classroom)': 'قاعة أ (القاعة الرئيسية)',
        'hall a': 'قاعة أ',
        'hall b': 'قاعة ب',
        'hall c': 'قاعة ج',
        'meeting room 1': 'غرفة اجتماعات 1',
        'meeting room 2': 'غرفة اجتماعات 2',
        'meeting room 3': 'غرفة اجتماعات 3',
        'meeting room': 'غرفة اجتماعات',
        'workshop hall': 'قاعة ورش العمل',
        'classroom 1': 'قاعة دراسية 1',
        'classroom 2': 'قاعة دراسية 2',
        'classroom 3': 'قاعة دراسية 3',
        'quiet zone': 'منطقة الهدوء والتركيز',
        'collaborative lounge': 'مساحة العمل المشتركة',
        'phone booth': 'كابينة الاتصال'
      };
      const lower = trimmed.toLowerCase();
      if (roomMap[lower]) return roomMap[lower];
      return trimmed;
    } else {
      const engRoomMap: Record<string, string> = {
        'قاعة أ (القاعة الرئيسية)': 'Hall A (Main Classroom)',
        'قاعة أ': 'Hall A',
        'قاعة ب': 'Hall B',
        'قاعة ج': 'Hall C',
        'غرفة اجتماعات 1': 'Meeting Room 1',
        'غرفة اجتماعات 2': 'Meeting Room 2',
        'غرفة اجتماعات 3': 'Meeting Room 3',
        'قاعة ورش العمل': 'Workshop Hall',
        'قاعة دراسية 1': 'Classroom 1',
        'قاعة دراسية 2': 'Classroom 2'
      };
      if (engRoomMap[trimmed]) return engRoomMap[trimmed];
      return trimmed;
    }
  }

  formatDateLocale(dateStr?: string): string {
    if (!dateStr) return '';
    const trimmed = dateStr.trim();
    if (!trimmed || trimmed.toUpperCase() === 'N/A' || trimmed === '-') {
      return this.isArabic() ? 'غير محدد' : 'N/A';
    }

    // Handle ISO strings with 'T'
    if (trimmed.includes('T')) {
      const fullIso = trimmed.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(trimmed) ? trimmed : trimmed + 'Z';
      const d = new Date(fullIso);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return this.formatDateLocale(`${y}-${m}-${day}`);
      }
    }

    if (this.isArabic()) {
      if (trimmed.toLowerCase() === 'today') return 'اليوم';
      if (trimmed.toLowerCase() === 'yesterday') return 'أمس';
      if (trimmed.toLowerCase() === 'tomorrow') return 'غداً';

      const monthsAr: Record<string, string> = {
        jan: 'يناير', january: 'يناير',
        feb: 'فبراير', february: 'فبراير',
        mar: 'مارس', march: 'مارس',
        apr: 'أبريل', april: 'أبريل',
        may: 'مايو',
        jun: 'يونيو', june: 'يونيو',
        jul: 'يوليو', july: 'يوليو',
        aug: 'أغسطس', august: 'أغسطس',
        sep: 'سبتمبر', september: 'سبتمبر',
        oct: 'أكتوبر', october: 'أكتوبر',
        nov: 'نوفمبر', november: 'نوفمبر',
        dec: 'ديسمبر', december: 'ديسمبر'
      };

      // Match format like "Oct 15, 2026" or "Sep 01, 2026"
      const m1 = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/);
      if (m1) {
        const monthKey = m1[1].toLowerCase();
        const day = m1[2];
        const year = m1[3] || '';
        const monthName = monthsAr[monthKey] || m1[1];
        return `${day} ${monthName} ${year}`.trim();
      }

      const m2 = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)(?:,?\s*(\d{4}))?$/);
      if (m2) {
        const day = m2[1];
        const monthKey = m2[2].toLowerCase();
        const year = m2[3] || '';
        const monthName = monthsAr[monthKey] || m2[2];
        return `${day} ${monthName} ${year}`.trim();
      }

      // Match YYYY-MM-DD
      const m3 = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m3) {
        const monthIdx = parseInt(m3[2], 10) - 1;
        const monthNamesList = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const monthName = monthNamesList[monthIdx] || m3[2];
        return `${m3[3]} ${monthName} ${m3[1]}`;
      }

      return trimmed;
    } else {
      if (trimmed === 'اليوم') return 'Today';
      if (trimmed === 'أمس') return 'Yesterday';
      if (trimmed === 'غداً') return 'Tomorrow';
      if (trimmed === 'غير محدد' || trimmed === 'لا ينطبق') return 'N/A';
      return trimmed;
    }
  }
}
