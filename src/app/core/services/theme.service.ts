import { Injectable, signal, computed } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  currentTheme = signal<Theme>('dark');
  isDark = computed(() => this.currentTheme() === 'dark');

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    this.setTheme(this.currentTheme());
  }

  toggleTheme(): void {
    const next: Theme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }
}
