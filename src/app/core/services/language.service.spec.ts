import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;

  beforeEach(() => {
    document.documentElement.removeAttribute('dir');
    document.documentElement.removeAttribute('lang');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('dir');
    document.documentElement.removeAttribute('lang');
  });

  it('should initialize with default Arabic language', () => {
    service = TestBed.inject(LanguageService);

    expect(service.currentLang()).toBe('ar');
    expect(service.isArabic()).toBe(true);
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
  });

  it('should toggle language to English and update DOM', () => {
    service = TestBed.inject(LanguageService);

    service.toggleLanguage();
    expect(service.currentLang()).toBe('en');
    expect(service.isArabic()).toBe(false);
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    expect(document.documentElement.getAttribute('lang')).toBe('en');

    service.toggleLanguage();
    expect(service.currentLang()).toBe('ar');
    expect(service.isArabic()).toBe(true);
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
  });

  it('should format durations correctly based on active language', () => {
    service = TestBed.inject(LanguageService);

    service.setLanguage('ar');
    expect(service.formatDurationLocale('2h 15m')).toBe('2 س 15 د');

    service.setLanguage('en');
    expect(service.formatDurationLocale('2 س 15 د')).toBe('2h 15m');
  });

  it('should format relative dates correctly based on active language', () => {
    service = TestBed.inject(LanguageService);

    service.setLanguage('ar');
    expect(service.formatDateLocale('today')).toBe('اليوم');
    expect(service.formatDateLocale('yesterday')).toBe('أمس');

    service.setLanguage('en');
    expect(service.formatDateLocale('اليوم')).toBe('Today');
    expect(service.formatDateLocale('أمس')).toBe('Yesterday');
  });
});
