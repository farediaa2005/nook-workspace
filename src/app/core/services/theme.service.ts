import { Injectable, signal, computed } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public static readonly THEME_KEY = 'nook_theme';

  private static getInitialTheme(): Theme {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(ThemeService.THEME_KEY);
        if (saved === 'light' || saved === 'dark') {
          return saved;
        }
      } catch {}
    }
    return 'dark';
  }

  readonly currentTheme = signal<Theme>(ThemeService.getInitialTheme());
  readonly isDark = computed(() => this.currentTheme() === 'dark');

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    this.applyThemeToDom(this.currentTheme());
  }

  toggleTheme(): void {
    const next: Theme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    this.applyThemeToDom(theme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ThemeService.THEME_KEY, theme);
      } catch {}
    }
  }

  private applyThemeToDom(theme: Theme): void {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }
}
