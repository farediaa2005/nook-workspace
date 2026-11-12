import { computed, signal, Signal } from '@angular/core';
import { formatLocalDateToISO } from '../../core/utils/date-time.util';
import { LanguageService } from '../../core/services/language.service';

export type RepeatOption = 'none' | 'daily' | 'weekly' | 'monthly' | 'weekdays' | 'custom';

export interface CustomRecurrence {
  interval: number;
  unit: 'day' | 'week' | 'month';
  daysOfWeek: number[];
  endType: 'never' | 'on_date' | 'after';
  occurrences: number;
  endDate: string;
}

export interface RecurrenceEditorOptions {
  lang: LanguageService;
  /** First day of the series (YYYY-MM-DD). */
  baseDate: () => string;
  /** Hours per session, for the cost preview. */
  durationHours: () => number;
  /** Price per hour, for the cost preview. */
  hourlyRate: () => number;
  /** Highest count the quick repeat stepper allows. */
  maxRepeat: number;
}

export const WEEK_DAYS = [
  { value: 6, label: 'س', labelEn: 'S', fullName: 'السبت', fullNameEn: 'Saturday' },
  { value: 0, label: 'ح', labelEn: 'S', fullName: 'الأحد', fullNameEn: 'Sunday' },
  { value: 1, label: 'ن', labelEn: 'M', fullName: 'الاثنين', fullNameEn: 'Monday' },
  { value: 2, label: 'ث', labelEn: 'T', fullName: 'الثلاثاء', fullNameEn: 'Tuesday' },
  { value: 3, label: 'ر', labelEn: 'W', fullName: 'الأربعاء', fullNameEn: 'Wednesday' },
  { value: 4, label: 'خ', labelEn: 'T', fullName: 'الخميس', fullNameEn: 'Thursday' },
  { value: 5, label: 'ج', labelEn: 'F', fullName: 'الجمعة', fullNameEn: 'Friday' },
];

/**
 * The "repeat" part of a booking form: quick options (daily, weekly …), the custom recurrence dialog,
 * and the list of dates the choice produces. Used by the room board and the reservations page,
 * which used to carry two copies of this code.
 * Methods are arrow functions so a component can expose them as its own (`toggleCustomDay = this.rec.toggleCustomDay`).
 */
export class RecurrenceEditor {
  readonly repeatOption = signal<RepeatOption>('none');
  readonly isRecurrenceDropdownOpen = signal(false);
  readonly repeatOccurrences = signal<number>(4);
  readonly isCustomRecurrenceModalOpen = signal(false);
  readonly customRecurrence = signal<CustomRecurrence>({
    interval: 1,
    unit: 'week',
    daysOfWeek: [3],
    endType: 'after',
    occurrences: 8,
    endDate: '',
  });
  readonly weekDaysList = WEEK_DAYS;

  constructor(private readonly o: RecurrenceEditorOptions) {}

  private parse(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  openCustomRecurrenceModal = (): void => {
    this.isRecurrenceDropdownOpen.set(false);
    const currDay = this.parse(this.o.baseDate()).getDay();
    this.customRecurrence.update((c) => ({
      ...c,
      unit: c.unit || 'week',
      endType: c.endType || 'after',
      occurrences: c.occurrences || 8,
      daysOfWeek: c.daysOfWeek && c.daysOfWeek.length > 0 ? c.daysOfWeek : [currDay],
    }));
    this.isCustomRecurrenceModalOpen.set(true);
  };

  closeCustomRecurrenceModal = (): void => {
    this.isCustomRecurrenceModalOpen.set(false);
  };

  saveCustomRecurrence = (): void => {
    this.repeatOption.set('custom');
    this.isCustomRecurrenceModalOpen.set(false);
  };

  setCustomOccurrencesPreset = (count: number): void => {
    this.customRecurrence.update((c) => ({ ...c, endType: 'after', occurrences: count }));
  };

  adjustCustomOccurrences = (delta: number): void => {
    this.customRecurrence.update((c) => ({
      ...c,
      endType: 'after',
      occurrences: Math.max(1, Math.min(60, (c.occurrences || 8) + delta)),
    }));
  };

  toggleCustomDay = (dayVal: number): void => {
    this.customRecurrence.update((curr) => {
      const exists = curr.daysOfWeek.includes(dayVal);
      const updated = exists
        ? curr.daysOfWeek.length > 1 ? curr.daysOfWeek.filter((d) => d !== dayVal) : curr.daysOfWeek
        : [...curr.daysOfWeek, dayVal].sort();
      return { ...curr, daysOfWeek: updated };
    });
  };

  isDaySelected = (dayVal: number): boolean => this.customRecurrence().daysOfWeek.includes(dayVal);

  updateCustomInterval = (val: string | number): void => {
    const num = Math.max(1, Math.min(99, parseInt(String(val), 10) || 1));
    this.customRecurrence.update((c) => ({ ...c, interval: num }));
  };

  updateCustomUnit = (unit: 'day' | 'week' | 'month'): void => {
    this.customRecurrence.update((c) => ({ ...c, unit }));
  };

  updateCustomEndType = (endType: 'never' | 'on_date' | 'after'): void => {
    this.customRecurrence.update((c) => ({ ...c, endType }));
  };

  updateCustomOccurrences = (val: string | number): void => {
    const num = Math.max(1, Math.min(50, parseInt(String(val), 10) || 1));
    this.customRecurrence.update((c) => ({ ...c, occurrences: num }));
  };

  updateCustomEndDate = (dateStr: string): void => {
    this.customRecurrence.update((c) => ({ ...c, endDate: dateStr }));
  };

  selectRepeatOption = (opt: RepeatOption): void => {
    if (opt === 'custom') {
      this.openCustomRecurrenceModal();
    } else {
      this.repeatOption.set(opt);
      this.isRecurrenceDropdownOpen.set(false);
    }
  };

  adjustRepeatOccurrences = (delta: number): void => {
    this.repeatOccurrences.update((v) => Math.max(2, Math.min(this.o.maxRepeat, v + delta)));
  };

  readonly customRecurrenceSummaryText: Signal<string> = computed(() => {
    const c = this.customRecurrence();
    const isAr = this.o.lang.isArabic();
    const t = this.o.lang.t();
    const tf = this.o.lang.tf.bind(this.o.lang);
    let text = '';
    if (c.interval === 1) {
      if (c.unit === 'day') text = t.resDaily2;
      else if (c.unit === 'week') text = t.resWeekly;
      else if (c.unit === 'month') text = t.resMonthly2;
    } else {
      if (c.unit === 'day') text = tf('loctEveryDays', { interval: c.interval });
      else if (c.unit === 'week') text = tf('loctEveryWeeks', { interval: c.interval });
      else if (c.unit === 'month') text = tf('loctEveryMonths', { interval: c.interval });
    }
    if (c.unit === 'week' && c.daysOfWeek.length > 0) {
      const dayNames = c.daysOfWeek
        .map((dVal) => this.weekDaysList.find((w) => w.value === dVal))
        .filter((w): w is (typeof WEEK_DAYS)[number] => !!w)
        .map((w) => (isAr ? w.fullName : w.fullNameEn));
      text += isAr ? ` في أيام ${dayNames.join('، ')}` : ` on ${dayNames.join(', ')}`;
    }
    if (c.endType === 'after') text += tf('loctOccurrences', { occurrences: c.occurrences });
    else if (c.endType === 'on_date' && c.endDate) text += tf('loctUntil', { endDate: c.endDate });
    return text;
  });

  readonly generatedRecurrenceDates: Signal<string[]> = computed(() => {
    const opt = this.repeatOption();
    const baseDateStr = this.o.baseDate();
    if (opt === 'none') return [baseDateStr];

    const baseDate = this.parse(baseDateStr);
    const dates: string[] = [baseDateStr];
    const addDays = (n: number) => { const d = new Date(baseDate); d.setDate(baseDate.getDate() + n); return d; };
    const addMonths = (n: number) => { const d = new Date(baseDate); d.setMonth(baseDate.getMonth() + n); return d; };

    if (opt === 'daily') {
      const count = this.repeatOccurrences() || 7;
      for (let i = 1; i < count; i++) dates.push(formatLocalDateToISO(addDays(i)));
    } else if (opt === 'weekly') {
      const count = this.repeatOccurrences() || 4;
      for (let i = 1; i < count; i++) dates.push(formatLocalDateToISO(addDays(i * 7)));
    } else if (opt === 'monthly') {
      const count = this.repeatOccurrences() || 3;
      for (let i = 1; i < count; i++) dates.push(formatLocalDateToISO(addMonths(i)));
    } else if (opt === 'weekdays') {
      const count = this.repeatOccurrences() || 5;
      let added = 1;
      for (let dayOffset = 1; added < count && dayOffset < 60; dayOffset++) {
        const next = addDays(dayOffset);
        const dow = next.getDay();
        if (dow !== 5 && dow !== 6) { dates.push(formatLocalDateToISO(next)); added++; }
      }
    } else if (opt === 'custom') {
      const c = this.customRecurrence();
      const targetCount = c.endType === 'after' ? c.occurrences : c.endType === 'never' ? 12 : 50;
      const untilDate = c.endType === 'on_date' && c.endDate ? new Date(c.endDate) : null;
      if (c.unit === 'day') {
        for (let i = 1; dates.length < targetCount && i < 100; i++) {
          const next = addDays(i * c.interval);
          if (untilDate && next > untilDate) break;
          dates.push(formatLocalDateToISO(next));
        }
      } else if (c.unit === 'week') {
        const days = c.daysOfWeek && c.daysOfWeek.length > 0 ? c.daysOfWeek : [baseDate.getDay()];
        for (let dayStep = 1; dates.length < targetCount && dayStep < 365; dayStep++) {
          const checkDate = addDays(dayStep);
          if (untilDate && checkDate > untilDate) break;
          if (days.includes(checkDate.getDay())) dates.push(formatLocalDateToISO(checkDate));
        }
      } else if (c.unit === 'month') {
        for (let i = 1; dates.length < targetCount && i < 36; i++) {
          const next = addMonths(i * c.interval);
          if (untilDate && next > untilDate) break;
          dates.push(formatLocalDateToISO(next));
        }
      }
    }
    return dates;
  });

  readonly upcomingRecurrenceDatesPreview: Signal<{ label: string; index: number }[]> = computed(() => {
    const isAr = this.o.lang.isArabic();
    return this.generatedRecurrenceDates().slice(0, 5).map((dStr, idx) => {
      const dt = this.parse(dStr);
      const dayName = dt.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short' });
      const datePart = dt.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' });
      return { index: idx + 1, label: `${dayName} ${datePart}` };
    });
  });

  readonly customTotalCostPreview: Signal<number> = computed(
    () => this.generatedRecurrenceDates().length * this.o.durationHours() * (this.o.hourlyRate() || 0),
  );
}
