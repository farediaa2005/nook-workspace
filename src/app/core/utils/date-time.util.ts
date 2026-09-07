/**
 * Date and Time Utilities for Local (Cairo / Browser) Timezone Conversion.
 * Ensures ASP.NET Core UTC ISO timestamps (DateTime.UtcNow) are properly
 * converted to the client's local timezone (UTC+3 Egypt) without naive string clipping.
 */

/** Appends 'Z' to ISO strings if timezone is omitted so JS parses it as UTC */
export function normalizeIsoString(isoStr?: string | null): string {
  if (!isoStr) return '';
  const trimmed = String(isoStr).trim();
  if (!trimmed || trimmed === '-') return '';
  if (!trimmed.includes('T')) return trimmed;
  // If it already has Z or an offset like +02:00 or -05:00, keep as-is
  if (trimmed.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed + 'Z';
}

/** Parses any ISO string safely into a Date object in local time */
export function parseIsoToLocalDateObj(isoStr?: string | null): Date {
  if (!isoStr) return new Date();
  const normalized = normalizeIsoString(isoStr);
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Convert ISO UTC timestamp or raw time to local 12-hour format "02:30 PM".
 * If an Arabic marker or period is already present, normalizes it.
 */
export function parseIsoToLocal12h(isoStr?: string | null, isArabic: boolean = false): string {
  if (!isoStr) return '';
  const trimmed = String(isoStr).trim();
  if (!trimmed || trimmed === '-') return '';

  if (trimmed.includes('T')) {
    const d = parseIsoToLocalDateObj(trimmed);
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const marker = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const padH = String(h).padStart(2, '0');
    if (isArabic) {
      return `${padH}:${m} ${marker === 'PM' ? 'م' : 'ص'}`;
    }
    return `${padH}:${m} ${marker}`;
  }

  // Already a time string
  const clean = trimmed
    .replace(/\b(AM\s+PM|PM\s+AM|AM\s+AM|PM\s+PM)\b/gi, m => m.toUpperCase().startsWith('P') ? 'PM' : 'AM')
    .replace(/(ص\s+م|م\s+ص|ص\s+ص|م\s+م)/g, m => m.startsWith('م') ? 'م' : 'ص');

  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|ص|م)?/i);
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
    if (isArabic) {
      return `${padH}:${m} ${marker === 'PM' ? 'م' : 'ص'}`;
    }
    return `${padH}:${m} ${marker}`;
  }

  return trimmed;
}

/** Convert ISO UTC timestamp or raw time to local 24-hour format "14:30" */
export function parseIsoToLocal24h(isoStr?: string | null): string {
  if (!isoStr) return '';
  const trimmed = String(isoStr).trim();
  if (!trimmed || trimmed === '-') return '';

  if (trimmed.includes('T')) {
    const d = parseIsoToLocalDateObj(trimmed);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|ص|م)?/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    let marker = (match[3] || '').toUpperCase();
    if (marker === 'PM' || marker === 'م') {
      if (h < 12) h += 12;
    } else if (marker === 'AM' || marker === 'ص') {
      if (h === 12) h = 0;
    }
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  return trimmed;
}

/** Convert ISO UTC timestamp or raw date to local "YYYY-MM-DD" */
export function parseIsoToLocalDate(isoStr?: string | null): string {
  if (!isoStr) return getTodayDateISO();
  const trimmed = String(isoStr).trim();
  if (!trimmed || trimmed === '-') return getTodayDateISO();
  if (!trimmed.includes('T')) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  const d = parseIsoToLocalDateObj(trimmed);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get today's local date as "YYYY-MM-DD" */
export function getTodayDateISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Convert minutes from midnight to 12h string "02:30 PM" */
export function convertMinutesTo12h(totalMinutes: number, isArabic: boolean = false): string {
  const mins = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  let h = Math.floor(mins / 60);
  const m = String(mins % 60).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const padH = String(h).padStart(2, '0');
  if (isArabic) {
    return `${padH}:${m} ${period === 'PM' ? 'م' : 'ص'}`;
  }
  return `${padH}:${m} ${period}`;
}

/** Convert minutes from midnight to 24h string "14:30" */
export function convertMinutesTo24h(totalMinutes: number): string {
  const mins = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/** Parse any time string ("02:30 PM", "14:30", "02:30 م") into total minutes from start of day */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const clean = String(timeStr).trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|ص|م)?/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const period = (match[3] || '').toUpperCase();
  if ((period === 'PM' || period === 'م') && hours < 12) hours += 12;
  if ((period === 'AM' || period === 'ص') && hours === 12) hours = 0;
  return hours * 60 + mins;
}

/** Convert any Date object to local "YYYY-MM-DD" string (avoids UTC date-shift of toISOString) */
export function formatLocalDateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Add days to today or a given date and return local "YYYY-MM-DD" */
export function addDaysToDateISO(days: number, fromDate?: Date | string): string {
  const base = fromDate ? (typeof fromDate === 'string' ? parseIsoToLocalDateObj(fromDate) : new Date(fromDate)) : new Date();
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return formatLocalDateToISO(d);
}
