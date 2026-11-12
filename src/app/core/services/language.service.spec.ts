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

  it('should initialize with default Arabic language', async () => {
    service = TestBed.inject(LanguageService);
    await service.preloadAll();

    expect(service.currentLang()).toBe('ar');
    expect(service.isArabic()).toBe(true);
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
  });

  it('should toggle language to English and update DOM', async () => {
    service = TestBed.inject(LanguageService);
    await service.preloadAll();

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

  it('should format durations correctly based on active language', async () => {
    service = TestBed.inject(LanguageService);
    await service.preloadAll();

    service.setLanguage('ar');
    expect(service.formatDurationLocale('2h 15m')).toBe('2 س 15 د');
    expect(service.formatDurationLocale('114 س 42 د')).toBe('4 يوم 18 س 42 د');
    expect(service.formatDurationLocale('114h 42m')).toBe('4 يوم 18 س 42 د');
    expect(service.formatDurationLocale('26h 10m')).toBe('1 يوم 2 س 10 د');

    service.setLanguage('en');
    expect(service.formatDurationLocale('2 س 15 د')).toBe('2h 15m');
    expect(service.formatDurationLocale('114 س 42 د')).toBe('4d 18h 42m');
    expect(service.formatDurationLocale('4 يوم 18 س 42 د')).toBe('4d 18h 42m');
  });

  it('should format relative dates correctly based on active language', async () => {
    service = TestBed.inject(LanguageService);
    await service.preloadAll();

    service.setLanguage('ar');
    expect(service.formatDateLocale('today')).toBe('اليوم');
    expect(service.formatDateLocale('yesterday')).toBe('أمس');

    service.setLanguage('en');
    expect(service.formatDateLocale('اليوم')).toBe('Today');
    expect(service.formatDateLocale('أمس')).toBe('Yesterday');
  });

  it('writes hours with Arabic number agreement and plain English', async () => {
    service = TestBed.inject(LanguageService);
    await service.preloadAll();

    service.setLanguage('ar');
    expect(service.hoursText(1)).toBe('ساعة واحدة');
    expect(service.hoursText(2)).toBe('ساعتان');
    expect(service.hoursText(3)).toBe('3 ساعات');
    expect(service.hoursText(10)).toBe('10 ساعات');
    expect(service.hoursText(11)).toBe('11 ساعة');
    expect(service.hoursText(2.5)).toBe('2.5 ساعة');

    service.setLanguage('en');
    expect(service.hoursText(1)).toBe('1 hour');
    expect(service.hoursText(4)).toBe('4 hours');
  });

  it('writes hours and minutes together', async () => {
    service = TestBed.inject(LanguageService);
    await service.preloadAll();

    service.setLanguage('ar');
    expect(service.hoursMinutesText(0, 45)).toBe('45 دقيقة');
    expect(service.hoursMinutesText(1, 0)).toBe('ساعة واحدة');
    expect(service.hoursMinutesText(1, 20)).toBe('ساعة و 20 دقيقة');
    expect(service.hoursMinutesText(2, 5)).toBe('ساعتان و 5 دقيقة');
    expect(service.hoursMinutesText(12, 30)).toBe('12 ساعة و 30 دقيقة');

    service.setLanguage('en');
    expect(service.hoursMinutesText(0, 45)).toBe('45 min');
    expect(service.hoursMinutesText(1, 20)).toBe('1 hr 20 min');
    expect(service.hoursMinutesText(3, 0)).toBe('3 hours');
    expect(service.hoursMinutesText(3, 15)).toBe('3 hrs 15 min');
  });
});
