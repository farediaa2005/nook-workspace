import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    try { localStorage.clear(); } catch {}
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    try { localStorage.clear(); } catch {}
    document.documentElement.removeAttribute('data-theme');
  });

  it('should initialize with default dark theme', () => {
    service = TestBed.inject(ThemeService);

    expect(service.currentTheme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should toggle theme from dark to light and back to dark', () => {
    service = TestBed.inject(ThemeService);

    service.toggleTheme();
    expect(service.currentTheme()).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    service.toggleTheme();
    expect(service.currentTheme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should set specified theme directly', () => {
    service = TestBed.inject(ThemeService);

    service.setTheme('light');
    expect(service.currentTheme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
