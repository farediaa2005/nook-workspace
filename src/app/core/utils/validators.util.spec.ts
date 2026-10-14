import { describe, it, expect } from 'vitest';
import {
  normalizeArabicDigits,
  sanitizePhoneInput,
  toEgyptianLocalPhone,
  isValidEgyptianPhone,
  isValidEmail,
  isValidPersonName,
  validateNameError,
  validatePhoneError,
  validateEmailError
} from './validators.util';

describe('Validators Util (O-6)', () => {
  describe('normalizeArabicDigits', () => {
    it('should convert Arabic-Indic numerals (٠-٩) to ASCII 0-9', () => {
      expect(normalizeArabicDigits('٠١٠١٢٣٤٥٦٧٨')).toBe('01012345678');
    });

    it('should convert Persian numerals (۰-۹) to ASCII 0-9', () => {
      expect(normalizeArabicDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
    });

    it('should handle mixed digits and text gracefully', () => {
      expect(normalizeArabicDigits('هاتف: ٠١١-١٢٣٤-٥٦٧٨')).toBe('هاتف: 011-1234-5678');
    });

    it('should return empty string for null/undefined/empty', () => {
      expect(normalizeArabicDigits('')).toBe('');
      expect(normalizeArabicDigits(null)).toBe('');
      expect(normalizeArabicDigits(undefined)).toBe('');
    });
  });

  describe('sanitizePhoneInput', () => {
    it('should strip spaces, dashes, and parens while keeping leading +', () => {
      expect(sanitizePhoneInput('+20 (10) 1234-5678')).toBe('+201012345678');
      expect(sanitizePhoneInput('011 2345 6789')).toBe('01123456789');
    });

    it('should normalize Arabic digits during sanitization', () => {
      expect(sanitizePhoneInput('+٢٠ ١٠ ١٢٣٤ ٥٦٧٨')).toBe('+201012345678');
    });
  });

  describe('toEgyptianLocalPhone', () => {
    it('should normalize 11-digit local Egyptian mobile numbers', () => {
      expect(toEgyptianLocalPhone('01012345678')).toBe('01012345678');
      expect(toEgyptianLocalPhone('01123456789')).toBe('01123456789');
      expect(toEgyptianLocalPhone('01234567890')).toBe('01234567890');
      expect(toEgyptianLocalPhone('01512345678')).toBe('01512345678');
    });

    it('should normalize international prefixes (+20, 0020, 20) to 11-digit local', () => {
      expect(toEgyptianLocalPhone('+201012345678')).toBe('01012345678');
      expect(toEgyptianLocalPhone('00201123456789')).toBe('01123456789');
      expect(toEgyptianLocalPhone('201234567890')).toBe('01234567890');
      expect(toEgyptianLocalPhone('+20 015 1234 5678')).toBe('01512345678');
    });

    it('should normalize Arabic-Indic digits to local format', () => {
      expect(toEgyptianLocalPhone('٠١٠١٢٣٤٥٦٧٨')).toBe('01012345678');
    });

    it('should return empty string for non-Egyptian or invalid numbers', () => {
      expect(toEgyptianLocalPhone('01312345678')).toBe(''); // invalid prefix 013
      expect(toEgyptianLocalPhone('010123456')).toBe(''); // too short
      expect(toEgyptianLocalPhone('0101234567899')).toBe(''); // too long
      expect(toEgyptianLocalPhone('abcdefghijk')).toBe(''); // letters
    });
  });

  describe('isValidEgyptianPhone', () => {
    it('should return true for valid Egyptian mobile numbers in various formats', () => {
      expect(isValidEgyptianPhone('01012345678')).toBe(true);
      expect(isValidEgyptianPhone('01198765432')).toBe(true);
      expect(isValidEgyptianPhone('01200000000')).toBe(true);
      expect(isValidEgyptianPhone('01555555555')).toBe(true);
      expect(isValidEgyptianPhone('+201012345678')).toBe(true);
      expect(isValidEgyptianPhone('00201198765432')).toBe(true);
      expect(isValidEgyptianPhone('٠١٠١٢٣٤٥٦٧٨')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(isValidEgyptianPhone('')).toBe(false);
      expect(isValidEgyptianPhone(null)).toBe(false);
      expect(isValidEgyptianPhone('0101234')).toBe(false);
      expect(isValidEgyptianPhone('01012345678abc')).toBe(false);
      expect(isValidEgyptianPhone('01412345678')).toBe(false); // 014 doesn't exist
      expect(isValidEgyptianPhone('0223456789')).toBe(false); // landline
    });
  });

  describe('isValidEmail', () => {
    it('should validate proper email formats', () => {
      expect(isValidEmail('student@nook.eg')).toBe(true);
      expect(isValidEmail('ahmed.ali+test@gmail.com')).toBe(true);
      expect(isValidEmail('user123@sub.domain.org')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('plainaddress')).toBe(false);
      expect(isValidEmail('@missingusername.com')).toBe(false);
      expect(isValidEmail('missingatsign.com')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
      expect(isValidEmail('user@domain.')).toBe(false);
      expect(isValidEmail('user@.com')).toBe(false);
    });

    it('should respect allowEmpty parameter', () => {
      expect(isValidEmail('', true)).toBe(true);
      expect(isValidEmail('   ', true)).toBe(true);
      expect(isValidEmail(null, true)).toBe(true);
      expect(isValidEmail('', false)).toBe(false);
    });
  });

  describe('isValidPersonName', () => {
    it('should validate legitimate Arabic and Latin names', () => {
      expect(isValidPersonName('أحمد علي')).toBe(true);
      expect(isValidPersonName('د. محمد كريم')).toBe(true);
      expect(isValidPersonName('Sarah Connor')).toBe(true);
      expect(isValidPersonName('Al-Sayed Omar')).toBe(true);
      expect(isValidPersonName('عمر')).toBe(true);
    });

    it('should reject names that are digits-only or symbols-only', () => {
      expect(isValidPersonName('12345')).toBe(false);
      expect(isValidPersonName('!@#$%^')).toBe(false);
      expect(isValidPersonName('123 456')).toBe(false);
      expect(isValidPersonName('---')).toBe(false);
      expect(isValidPersonName('a')).toBe(false); // too short
      expect(isValidPersonName('')).toBe(false);
      expect(isValidPersonName(null)).toBe(false);
    });
  });

  describe('Validation Error Formatters', () => {
    it('should format localized name error', () => {
      expect(validateNameError('', true, true)).toContain('يرجى إدخال الاسم');
      expect(validateNameError('1234', true, true)).toContain('الاسم غير صالح');
      expect(validateNameError('أحمد محمود', true, true)).toBeNull();
    });

    it('should format localized phone error', () => {
      expect(validatePhoneError('', true, true, 'رقم الهاتف')).toContain('يرجى إدخال رقم الهاتف');
      expect(validatePhoneError('123', true, true, 'رقم الهاتف')).toContain('رقم الهاتف غير صحيح');
      expect(validatePhoneError('01012345678', true, true, 'رقم الهاتف')).toBeNull();
    });

    it('should format localized email error', () => {
      expect(validateEmailError('', true, false)).toBeNull();
      expect(validateEmailError('bad-email', true, false)).toContain('صيغة البريد الإلكتروني غير صحيحة');
      expect(validateEmailError('valid@test.com', true, false)).toBeNull();
    });
  });
});
