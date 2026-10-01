import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  ElementRef,
  ViewChild,
  HostListener,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../core/services/theme.service';

export interface ClockTimeSelection {
  startTime: string;
  endTime: string;
  durationHours: number;
}

@Component({
  selector: 'app-clock-time-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clock-time-picker.component.html',
  styleUrl: './clock-time-picker.component.css'
})
export class ClockTimePickerComponent {
  private themeService = inject(ThemeService);
  isDark = this.themeService.isDark;

  @ViewChild('clockFace') clockFaceRef?: ElementRef<HTMLDivElement>;

  // Inputs
  startTime = input<string>('09:00 AM');
  endTime = input<string>('11:00 AM');
  isRange = input<boolean>(true);
  hourlyRate = input<number>(0);
  isArabic = input<boolean>(false);

  // Outputs
  startTimeChange = output<string>();
  endTimeChange = output<string>();
  timeConfirmed = output<ClockTimeSelection>();
  close = output<void>();

  // State
  activeTarget = signal<'start' | 'end'>('start');
  pickerMode = signal<'hours' | 'minutes'>('hours');
  isDragging = signal<boolean>(false);

  // Start Time Internal
  startHour = signal<number>(9);
  startMinute = signal<number>(0);
  startPeriod = signal<'AM' | 'PM'>('AM');

  // End Time Internal
  endHour = signal<number>(11);
  endMinute = signal<number>(0);
  endPeriod = signal<'AM' | 'PM'>('AM');

  // Hours dial numbers: 1 to 12
  readonly hourNumbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  // Minute dial numbers: 00 to 55 (every 5 mins)
  readonly minuteNumbers = [
    { label: '00', val: 0 },
    { label: '05', val: 5 },
    { label: '10', val: 10 },
    { label: '15', val: 15 },
    { label: '20', val: 20 },
    { label: '25', val: 25 },
    { label: '30', val: 30 },
    { label: '35', val: 35 },
    { label: '40', val: 40 },
    { label: '45', val: 45 },
    { label: '50', val: 50 },
    { label: '55', val: 55 }
  ];

  // Quick duration presets (in minutes)
  readonly durationPresets = [
    { mins: 30, labelEn: '30m', labelAr: '30 د' },
    { mins: 60, labelEn: '1h', labelAr: 'ساعة' },
    { mins: 90, labelEn: '1.5h', labelAr: 'ساعة ونصف' },
    { mins: 120, labelEn: '2h', labelAr: 'ساعتان' },
    { mins: 180, labelEn: '3h', labelAr: '3 ساعات' },
    { mins: 240, labelEn: '4h', labelAr: '4 ساعات' }
  ];

  constructor() {
    // Synchronize initial input values
    effect(() => {
      const s = this.startTime();
      if (s) {
        const parsed = this.parseTimeString(s);
        if (parsed) {
          this.startHour.set(parsed.hour);
          this.startMinute.set(parsed.minute);
          this.startPeriod.set(parsed.period);
        }
      }
    });

    effect(() => {
      const e = this.endTime();
      if (e) {
        const parsed = this.parseTimeString(e);
        if (parsed) {
          this.endHour.set(parsed.hour);
          this.endMinute.set(parsed.minute);
          this.endPeriod.set(parsed.period);
        }
      }
    });
  }

  // Current values depending on active target
  currentHour = computed<number>(() => {
    return this.activeTarget() === 'start' ? this.startHour() : this.endHour();
  });

  currentMinute = computed<number>(() => {
    return this.activeTarget() === 'start' ? this.startMinute() : this.endMinute();
  });

  currentPeriod = computed<'AM' | 'PM'>(() => {
    return this.activeTarget() === 'start' ? this.startPeriod() : this.endPeriod();
  });

  formattedStart = computed<string>(() => {
    const h = String(this.startHour()).padStart(2, '0');
    const m = String(this.startMinute()).padStart(2, '0');
    return `${h}:${m} ${this.startPeriod()}`;
  });

  formattedEnd = computed<string>(() => {
    const h = String(this.endHour()).padStart(2, '0');
    const m = String(this.endMinute()).padStart(2, '0');
    return `${h}:${m} ${this.endPeriod()}`;
  });

  // Calculate total duration in hours
  durationHours = computed<number>(() => {
    const sMins = this.toMinutes(this.startHour(), this.startMinute(), this.startPeriod());
    let eMins = this.toMinutes(this.endHour(), this.endMinute(), this.endPeriod());
    if (eMins <= sMins) {
      eMins += 24 * 60; // cross midnight
    }
    const diff = eMins - sMins;
    return +(diff / 60).toFixed(1);
  });

  durationDisplayText = computed<string>(() => {
    const d = this.durationHours();
    if (this.isArabic()) {
      if (d === 1) return 'ساعة واحدة';
      if (d === 2) return 'ساعتان';
      if (d > 2 && d <= 10) return `${d} ساعات`;
      return `${d} ساعة`;
    }
    return `${d} ${d === 1 ? 'hour' : 'hours'}`;
  });

  // Angle of clock hand
  handRotationDeg = computed<number>(() => {
    if (this.pickerMode() === 'hours') {
      const h = this.currentHour() % 12;
      return h * 30; // 360 / 12 = 30 deg per hour
    } else {
      const m = this.currentMinute() % 60;
      return m * 6; // 360 / 60 = 6 deg per minute
    }
  });

  // Position numbers along circle
  getNumberTransform(index: number, total: number = 12): { [key: string]: string } {
    const angle = (index % total) * (360 / total);
    const rad = (angle - 90) * (Math.PI / 180);
    const radius = 86; // px distance from center of 230px dial
    const x = Math.round(Math.cos(rad) * radius);
    const y = Math.round(Math.sin(rad) * radius);

    return {
      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
    };
  }

  setTarget(target: 'start' | 'end'): void {
    this.activeTarget.set(target);
    this.pickerMode.set('hours');
  }

  setPickerMode(mode: 'hours' | 'minutes'): void {
    this.pickerMode.set(mode);
  }

  togglePeriod(period: 'AM' | 'PM'): void {
    if (this.activeTarget() === 'start') {
      this.startPeriod.set(period);
      this.startTimeChange.emit(this.formattedStart());
    } else {
      this.endPeriod.set(period);
      this.endTimeChange.emit(this.formattedEnd());
    }
  }

  selectHour(h: number): void {
    if (this.activeTarget() === 'start') {
      this.startHour.set(h);
      this.startTimeChange.emit(this.formattedStart());
    } else {
      this.endHour.set(h);
      this.endTimeChange.emit(this.formattedEnd());
    }

    // Auto-advance to minute mode smoothly
    setTimeout(() => {
      this.pickerMode.set('minutes');
    }, 200);
  }

  selectMinute(m: number): void {
    if (this.activeTarget() === 'start') {
      this.startMinute.set(m);
      this.startTimeChange.emit(this.formattedStart());

      // If in range mode, advance to end time selection if start was just picked
      if (this.isRange()) {
        setTimeout(() => {
          this.activeTarget.set('end');
          this.pickerMode.set('hours');
        }, 250);
      }
    } else {
      this.endMinute.set(m);
      this.endTimeChange.emit(this.formattedEnd());
    }
  }

  applyPreset(mins: number): void {
    const startMins = this.toMinutes(this.startHour(), this.startMinute(), this.startPeriod());
    const endMins = (startMins + mins) % (24 * 60);

    const { hour, minute, period } = this.fromMinutes(endMins);
    this.endHour.set(hour);
    this.endMinute.set(minute);
    this.endPeriod.set(period);
    this.endTimeChange.emit(this.formattedEnd());
  }

  setToNow(): void {
    const now = new Date();
    let h = now.getHours();
    const m = Math.round(now.getMinutes() / 5) * 5 % 60;
    const p: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;

    if (this.activeTarget() === 'start') {
      this.startHour.set(h);
      this.startMinute.set(m);
      this.startPeriod.set(p);
      this.startTimeChange.emit(this.formattedStart());

      // Auto update end to +2 hours
      const endMins = (this.toMinutes(h, m, p) + 120) % (24 * 60);
      const parsedEnd = this.fromMinutes(endMins);
      this.endHour.set(parsedEnd.hour);
      this.endMinute.set(parsedEnd.minute);
      this.endPeriod.set(parsedEnd.period);
      this.endTimeChange.emit(this.formattedEnd());
    } else {
      this.endHour.set(h);
      this.endMinute.set(m);
      this.endPeriod.set(p);
      this.endTimeChange.emit(this.formattedEnd());
    }
  }

  onFaceClick(event: MouseEvent | TouchEvent): void {
    this.handleClockInput(event);
  }

  onStartDrag(event: MouseEvent | TouchEvent): void {
    this.isDragging.set(true);
    this.handleClockInput(event);
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onDrag(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging()) return;
    this.handleClockInput(event);
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onStopDrag(): void {
    if (this.isDragging()) {
      this.isDragging.set(false);
      if (this.pickerMode() === 'hours') {
        setTimeout(() => this.pickerMode.set('minutes'), 200);
      }
    }
  }

  private handleClockInput(event: MouseEvent | TouchEvent): void {
    if (!this.clockFaceRef?.nativeElement) return;
    const rect = this.clockFaceRef.nativeElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;

    // Angle in degrees from top (12 o'clock = 0 deg)
    const rad = Math.atan2(deltaY, deltaX);
    let deg = (rad * 180 / Math.PI) + 90;
    if (deg < 0) deg += 360;

    if (this.pickerMode() === 'hours') {
      let h = Math.round(deg / 30) % 12;
      if (h === 0) h = 12;
      if (this.activeTarget() === 'start') {
        this.startHour.set(h);
        this.startTimeChange.emit(this.formattedStart());
      } else {
        this.endHour.set(h);
        this.endTimeChange.emit(this.formattedEnd());
      }
    } else {
      // Snap to nearest minute or 5 min
      let m = Math.round(deg / 6) % 60;
      if (this.activeTarget() === 'start') {
        this.startMinute.set(m);
        this.startTimeChange.emit(this.formattedStart());
      } else {
        this.endMinute.set(m);
        this.endTimeChange.emit(this.formattedEnd());
      }
    }
  }

  confirm(): void {
    this.timeConfirmed.emit({
      startTime: this.formattedStart(),
      endTime: this.formattedEnd(),
      durationHours: this.durationHours()
    });
  }

  cancel(): void {
    this.close.emit();
  }

  private parseTimeString(val: string): { hour: number; minute: number; period: 'AM' | 'PM' } | null {
    if (!val) return null;
    const match = val.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|ص|م)?$/i);
    if (!match) return null;

    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    let p: 'AM' | 'PM' = 'AM';

    if (match[3]) {
      const s = match[3].toUpperCase();
      p = (s === 'PM' || s === 'م') ? 'PM' : 'AM';
    } else {
      p = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
    }

    if (h === 0) h = 12;
    return { hour: h, minute: isNaN(m) ? 0 : m, period: p };
  }

  private toMinutes(h: number, m: number, p: 'AM' | 'PM'): number {
    let hours24 = h % 12;
    if (p === 'PM') hours24 += 12;
    return hours24 * 60 + m;
  }

  private fromMinutes(mins: number): { hour: number; minute: number; period: 'AM' | 'PM' } {
    let totalH = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const p: 'AM' | 'PM' = totalH >= 12 ? 'PM' : 'AM';
    let h12 = totalH % 12;
    if (h12 === 0) h12 = 12;
    return { hour: h12, minute: m, period: p };
  }
}
