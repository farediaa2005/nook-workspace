/**
 * Comprehensive input validation utilities for NOOK Workspace.
 * 
 * Supports:
 * - Normalizing Arabic-Indic numerals (٠-٩) and Persian digits (۰-۹) to standard Western digits (0-9).
 * - Sanitizing and verifying Egyptian phone / WhatsApp numbers (local 11-digit 01[0125]xxxxxxxx and intl +20 / 0020).
 * - Robust email validation with LTR presentation safeguards.
 * - Meaningful person name validation (minimum 2 characters, rejecting purely numeric, symbols-only, or garbage strings).
 */

const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Normalizes Arabic-Indic and Persian numeral characters to standard ASCII digits 0-9.
 */
export function normalizeArabicDigits(value: string | null | undefined): string {
  if (!value) return '';
  let result = String(value);
  for (let i = 0; i < 10; i++) {
    result = result.split(ARABIC_INDIC_DIGITS[i]).join(String(i));
    result = result.split(PERSIAN_DIGITS[i]).join(String(i));
  }
  return result;
}

/**
 * Checks if a string contains any invalid characters for a phone number
 * (letters, illegal punctuation, etc.). Only digits, whitespace, dashes,
 * parentheses, dots, and a single leading plus are permitted.
 */
export function containsInvalidPhoneCharacters(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = normalizeArabicDigits(value).trim();
  // Allow leading +, digits, spaces, dashes, dots, parentheses
  return /[^\d\s\-().+]/.test(normalized);
}

/**
 * Sanitizes phone input by normalizing Arabic digits and stripping all characters
 * except digits and an optional leading '+'.
 */
export function sanitizePhoneInput(value: string | null | undefined): string {
  if (!value) return '';
  const normalized = normalizeArabicDigits(value).trim();
  const hasLeadingPlus = normalized.startsWith('+');
  const digitsOnly = normalized.replace(/\D/g, '');
  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Converts any valid Egyptian mobile phone number (local or international)
 * into the canonical local 11-digit representation (e.g., "01012345678").
 * Returns empty string if the number contains invalid characters or is not a valid format.
 */
export function toEgyptianLocalPhone(value: string | null | undefined): string {
  if (!value) return '';
  if (containsInvalidPhoneCharacters(value)) return '';

  const sanitized = sanitizePhoneInput(value);
  if (!sanitized) return '';

  let digits = sanitized;
  // Handle leading international prefixes
  if (digits.startsWith('+20')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('0020')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('20') && digits.length === 12) {
    digits = digits.slice(2);
  }

  // Ensure leading 0 for Egyptian mobile prefix 01[0125]
  if (digits.length === 10 && /^[1][0125]\d{8}$/.test(digits)) {
    digits = `0${digits}`;
  }

  if (/^01[0125]\d{8}$/.test(digits)) {
    return digits;
  }
  return '';
}

/**
 * Validates whether a phone / WhatsApp string is a valid Egyptian mobile phone number.
 * Accepts:
 * - Local format: 010xxxxxxxx, 011xxxxxxxx, 012xxxxxxxx, 015xxxxxxxx (11 digits)
 * - International format: +2010xxxxxxxx, 002011xxxxxxxx, 2012xxxxxxxx
 * - Tolerates whitespace, dashes, and Arabic-Indic numerals.
 * - Rejects any characters that are letters or illegal symbols.
 */
export function isValidEgyptianPhone(value: string | null | undefined): boolean {
  if (!value) return false;
  if (containsInvalidPhoneCharacters(value)) return false;
  const canonical = toEgyptianLocalPhone(value);
  return canonical.length === 11;
}

/**
 * Email validation regex following standard web RFC practical constraints.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Checks whether an email string is valid.
 * If allowEmpty is true, empty strings or undefined return true (optional field).
 */
export function isValidEmail(value: string | null | undefined, allowEmpty = false): boolean {
  if (!value || !value.trim()) {
    return allowEmpty;
  }
  const clean = value.trim();
  return EMAIL_REGEX.test(clean);
}

/**
 * Name regex requiring at least 2 characters, contains at least two alphabetic letters
 * (Arabic letters or Latin letters), and rejecting strings that are purely digits,
 * whitespace, or symbols/punctuation.
 */
export function isValidPersonName(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return false;

  // Must only contain letters (Arabic, Latin, marks), spaces, hyphens, dots, apostrophes
  if (!/^[\p{L}\p{M}\s.'\-]+$/u.test(trimmed)) {
    return false;
  }

  // Must contain at least two letters
  const letters = trimmed.match(/[\p{L}]/gu);
  return !!letters && letters.length >= 2;
}

/**
 * Localized error messages for name fields.
 */
export function validateNameError(value: string | null | undefined, isArabic = true, required = true): string | null {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return required
      ? (isArabic ? 'يرجى إدخال الاسم (حرفين على الأقل)' : 'Name is required (at least 2 letters)')
      : null;
  }
  if (!isValidPersonName(trimmed)) {
    return isArabic
      ? 'الاسم غير صالح؛ يجب أن يحتوي على حرفين على الأقل ولا يمكن أن يتكون من أرقام أو رموز فقط'
      : 'Invalid name; must contain at least 2 letters and cannot be only digits or symbols';
  }
  return null;
}

/**
 * Localized error messages for Egyptian phone & WhatsApp fields.
 */
export function validatePhoneError(
  value: string | null | undefined,
  isArabic = true,
  required = true,
  fieldLabel = isArabic ? 'رقم الهاتف' : 'Phone number'
): string | null {
  const raw = (value || '').trim();
  if (!raw) {
    return required
      ? (isArabic ? `يرجى إدخال ${fieldLabel}` : `${fieldLabel} is required`)
      : null;
  }
  if (!isValidEgyptianPhone(raw)) {
    return isArabic
      ? `${fieldLabel} غير صحيح (يجب أن يكون 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015)`
      : `Invalid ${fieldLabel.toLowerCase()} (must be an 11-digit Egyptian mobile starting with 010, 011, 012, or 015)`;
  }
  return null;
}

/**
 * Localized error messages for email fields.
 */
export function validateEmailError(value: string | null | undefined, isArabic = true, required = false): string | null {
  const raw = (value || '').trim();
  if (!raw) {
    return required
      ? (isArabic ? 'يرجى إدخال البريد الإلكتروني' : 'Email is required')
      : null;
  }
  if (!isValidEmail(raw)) {
    return isArabic
      ? 'صيغة البريد الإلكتروني غير صحيحة (مثال: name@example.com)'
      : 'Invalid email address format (e.g. name@example.com)';
  }
  return null;
}
