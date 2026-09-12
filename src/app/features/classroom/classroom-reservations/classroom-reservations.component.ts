import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LanguageService } from '../../../core/services/language.service';
import { ClassroomService } from '../../../core/services/classroom.service';
import { ShiftService } from '../../../core/services/shift.service';
import {
  ClassroomCard,
  AdminReservation,
  AdminConsoleRoom,
  GridSlot,
  RenderedBlock,
  CheckReservationConflictDto,
  ReservationConflictCheckResultDto,
  CancelReservationDayDto
} from '../../../core/models/classroom.model';
import { FormsModule } from '@angular/forms';
import { ReservationDetailPanelComponent } from '../../../shared/components/reservation-detail-panel/reservation-detail-panel.component';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';
import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';
import { WorkspaceService } from '../../../core/services/workspace.service';

@Component({
  selector: 'app-classroom-reservations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReservationDetailPanelComponent,
    PrimaryButtonComponent
  ],
  templateUrl: './classroom-reservations.component.html',
  styleUrl: './classroom-reservations.component.css'
})
export class ClassroomReservationsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scheduleScroll') scheduleScrollRef?: ElementRef<HTMLDivElement>;

  private langService = inject(LanguageService);
  protected classroomService = inject(ClassroomService);
  private workspaceService = inject(WorkspaceService);
  protected shiftService = inject(ShiftService);
  private router = inject(Router);
  private timerHandle: any = null;

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // Selected Calendar Date (Default to today's date dynamically)
  selectedDate = signal<Date>(new Date());

  // Rooms definition mapped from ClassroomService selectable rooms
  rooms = computed<AdminConsoleRoom[]>(() => {
    return this.classroomService.rooms().map(r => ({
      id: r.id,
      name: r.name,
      capacity: r.maxCapacity,
      hourlyRate: r.hourlyRate,
      image: r.imageUrl
    }));
  });

  roomOptions = computed<SelectOption[]>(() => {
    return this.rooms().map(r => ({
      label: r.name,
      value: r.name
    }));
  });

  // Full 24 Hours of the day (00:00 / 12 AM to 23:00 / 11 PM)
  timeSlots: GridSlot[] = [
    { timeStr: '00:00', hour: 0 },
    { timeStr: '01:00', hour: 1 },
    { timeStr: '02:00', hour: 2 },
    { timeStr: '03:00', hour: 3 },
    { timeStr: '04:00', hour: 4 },
    { timeStr: '05:00', hour: 5 },
    { timeStr: '06:00', hour: 6 },
    { timeStr: '07:00', hour: 7 },
    { timeStr: '08:00', hour: 8 },
    { timeStr: '09:00', hour: 9 },
    { timeStr: '10:00', hour: 10 },
    { timeStr: '11:00', hour: 11 },
    { timeStr: '12:00', hour: 12 },
    { timeStr: '13:00', hour: 13 },
    { timeStr: '14:00', hour: 14 },
    { timeStr: '15:00', hour: 15 },
    { timeStr: '16:00', hour: 16 },
    { timeStr: '17:00', hour: 17 },
    { timeStr: '18:00', hour: 18 },
    { timeStr: '19:00', hour: 19 },
    { timeStr: '20:00', hour: 20 },
    { timeStr: '21:00', hour: 21 },
    { timeStr: '22:00', hour: 22 },
    { timeStr: '23:00', hour: 23 }
  ];

  // Grid dimensions
  readonly rowHeight = 48; // 48px per hour
  readonly gridStartHour = 0; // Starts at 00:00 (12:00 AM)

  // Computed reservations mapped from classroomService backend reservations & cards
  reservations = computed<AdminReservation[]>(() => {
    const backendRes = this.classroomService.reservations() || [];
    const cardRes = (this.classroomService.cards() || [])
      .filter(c => c && c.status !== 'available')
      .map(c => this.mapCardToReservation(c))
      .filter((r): r is AdminReservation => r !== null && !!r.startTime);

    const combined = [...backendRes];
    for (const cr of cardRes) {
      if (!combined.some(b => b.id === cr.id)) {
        combined.push(cr);
      }
    }

    const todayISO = this.classroomService.getTodayDateISO();
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    return combined.map(res => {
      if (res.status === 'cancelled' || res.status === 'completed') return res;

      const rawResDate = res.date === 'Today' ? todayISO : (res.date || todayISO);
      const resDate = (rawResDate || '').split('T')[0];
      let calculatedStatus: 'active' | 'upcoming' | 'completed' | 'cancelled' = res.status || 'upcoming';

      if (resDate < todayISO) {
        calculatedStatus = 'completed';
      } else if (resDate > todayISO) {
        calculatedStatus = 'upcoming';
      } else {
        // Today
        const [sH, sM] = (res.startTime || '00:00').split(':').map(Number);
        const [eH, eM] = (res.endTime || '00:00').split(':').map(Number);
        const sMins = (isNaN(sH) ? 0 : sH) * 60 + (isNaN(sM) ? 0 : sM);
        const eMins = (isNaN(eH) ? 0 : eH) * 60 + (isNaN(eM) ? 0 : eM);

        if (nowMins >= eMins && eMins > sMins) {
          calculatedStatus = 'completed';
        } else if (nowMins >= sMins && nowMins < eMins) {
          calculatedStatus = 'active';
        } else if (nowMins < sMins) {
          calculatedStatus = 'upcoming';
        }
      }

      return {
        ...res,
        status: calculatedStatus
      };
    });
  });

  // Computed reservations filtered for the table by currently selected date
  filteredTableReservations = computed<AdminReservation[]>(() => {
    const resList = this.reservations();
    const d = this.selectedDate();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const selectedDateISO = `${year}-${month}-${day}`;

    const yesterday = new Date(d);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const todayISO = this.classroomService.getTodayDateISO();

    return resList.filter(res => {
      if (!res || !res.startTime || !res.endTime) return false;
      const [sH, sM] = (res.startTime || '00:00').split(':').map(Number);
      const [eH, eM] = (res.endTime || '00:00').split(':').map(Number);
      const startMins = (isNaN(sH) ? 0 : sH) * 60 + (isNaN(sM) ? 0 : sM);
      const endMins = (isNaN(eH) ? 0 : eH) * 60 + (isNaN(eM) ? 0 : eM);
      const crossesMidnight = endMins < startMins;

      // Handle raw date conversion
      const rawDateISO = res.date === 'Today' ? todayISO : (res.date || todayISO);
      const resDateISO = (rawDateISO || '').split('T')[0];

      // Normal booking: must match selected date
      // Cross-midnight booking: matches starting date or ending date (tomorrow)
      if (crossesMidnight) {
        return resDateISO === selectedDateISO || resDateISO === yesterdayISO;
      }
      return resDateISO === selectedDateISO;
    });
  });

  // Side Drawer state
  isDetailPanelOpen = signal<boolean>(false);
  selectedReservation = signal<AdminReservation | null>(null);
  activeActionMenuId = signal<string | null>(null);
  actionMenuPosition = signal<{ top?: number; bottom?: number; left?: number; right?: number; transformOrigin?: string }>({});

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onWindowScrollOrResize(): void {
    if (this.activeActionMenuId()) {
      this.closeActionMenu();
    }
  }

  toggleActionMenu(id: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.activeActionMenuId() === id) {
      this.activeActionMenuId.set(null);
      return;
    }

    if (event && event.currentTarget) {
      const btn = event.currentTarget as HTMLElement;
      const rect = btn.getBoundingClientRect();
      const menuHeight = 270;
      const menuWidth = 180;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      const isRtl = this.isArabic() || document.documentElement.dir === 'rtl' || document.body.getAttribute('dir') === 'rtl';

      const pos: { top?: number; bottom?: number; left?: number; right?: number; transformOrigin?: string } = {};

      // If space below is not enough for the full menu and space above is larger, open as dropup
      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        pos.bottom = Math.max(10, viewportHeight - rect.top + 4);
        pos.transformOrigin = isRtl ? 'bottom left' : 'bottom right';
      } else {
        pos.top = Math.max(10, rect.bottom + 4);
        pos.transformOrigin = isRtl ? 'top left' : 'top right';
      }

      // Horizontal positioning
      if (isRtl) {
        let targetLeft = rect.left;
        if (targetLeft + menuWidth > viewportWidth) {
          targetLeft = Math.max(10, viewportWidth - menuWidth - 10);
        }
        if (targetLeft < 10) targetLeft = 10;
        pos.left = targetLeft;
      } else {
        let targetRight = viewportWidth - rect.right;
        if (targetRight + menuWidth > viewportWidth) {
          targetRight = Math.max(10, viewportWidth - menuWidth - 10);
        }
        if (targetRight < 10) targetRight = 10;
        pos.right = targetRight;
      }

      this.actionMenuPosition.set(pos);
    }

    this.activeActionMenuId.set(id);
  }

  closeActionMenu(): void {
    this.activeActionMenuId.set(null);
  }

  // Date formatted display string matching design: "Today — July 18, 2025" (now current date)
  dateDisplayText = computed(() => {
    const d = this.selectedDate();
    const formattedDate = d.toLocaleDateString(
      this.isArabic() ? 'ar-u-nu-latn' : 'en-US',
      { month: 'long', day: 'numeric', year: 'numeric' }
    );

    const today = new Date();
    const isRealToday = d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();

    const prefix = isRealToday ? this.t().todayText : '';

    if (prefix) {
      return `${prefix} — ${formattedDate}`;
    }
    return formattedDate;
  });

  // Rendered blocks calculated cleanly for the 24-hour CSS grid (with Midnight Crossover splitting)
  gridBlocks = computed<RenderedBlock[]>(() => {
    const resList = this.reservations();
    const roomsList = this.rooms();
    const totalRooms = roomsList.length || 1;
    const blocks: RenderedBlock[] = [];

    // Format current selected date as ISO string (YYYY-MM-DD)
    const d = this.selectedDate();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const selectedDateISO = `${year}-${month}-${day}`;

    // Helper for yesterday
    const yesterday = new Date(d);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const todayISO = this.classroomService.getTodayDateISO();
    const isRtl = this.isArabic();

    for (const res of resList) {
      if (!res || res.status === 'cancelled' || !res.startTime || !res.endTime) continue;

      let roomIndex = roomsList.findIndex(r => r.name.toLowerCase() === (res.classroom || '').toLowerCase() || r.id === res.classroom);
      if (roomIndex === -1 && res.classroom) {
        roomIndex = roomsList.findIndex(r => r.name.toLowerCase().includes(res.classroom.toLowerCase()) || res.classroom.toLowerCase().includes(r.name.toLowerCase()));
      }
      if (roomIndex === -1) {
        roomIndex = res.classroom ? Math.abs(res.classroom.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % totalRooms : 0;
      }

      const [sH, sM] = (res.startTime || '00:00').split(':').map(Number);
      const [eH, eM] = (res.endTime || '00:00').split(':').map(Number);

      const startMins = (isNaN(sH) ? 0 : sH) * 60 + (isNaN(sM) ? 0 : sM);
      const endMins = (isNaN(eH) ? 0 : eH) * 60 + (isNaN(eM) ? 0 : eM);
      const crossesMidnight = endMins < startMins;

      // Handle raw date conversion
      const rawDateISO = res.date === 'Today' ? todayISO : (res.date || todayISO);
      const resDateISO = (rawDateISO || '').split('T')[0];

      const posStyle = `calc(75px + ${roomIndex} * ((100% - 75px) / ${totalRooms}) + 3px)`;
      const leftStyle = isRtl ? 'auto' : posStyle;
      const rightStyle = isRtl ? posStyle : 'auto';
      const widthStyle = `calc(((100% - 75px) / ${totalRooms}) - 6px)`;

      if (crossesMidnight) {
        // SEGMENT 1: Starts on the booking date, ends at midnight (12:00 AM)
        if (resDateISO === selectedDateISO) {
          const startMinutesFromGridStart = startMins;
          const durMinutes = 24 * 60 - startMins; // ends at midnight

          const topPx = (startMinutesFromGridStart / 60) * this.rowHeight;
          const heightPx = (durMinutes / 60) * this.rowHeight;

          blocks.push({
            reservation: {
              ...res,
              activity: `${res.activity} (${this.t().starts})`
            },
            roomIndex,
            startMinutes: startMinutesFromGridStart,
            durationMinutes: durMinutes,
            topPx,
            heightPx,
            leftStyle,
            rightStyle,
            widthStyle
          });
        }
        // SEGMENT 2: Continues on the day after the booking date, starting at midnight (12:00 AM)
        else if (resDateISO === yesterdayISO) {
          const startMinutesFromGridStart = 0; // starts at midnight
          const durMinutes = endMins; // ends at endMins

          const topPx = 0;
          const heightPx = (durMinutes / 60) * this.rowHeight;

          blocks.push({
            reservation: {
              ...res,
              activity: `${res.activity} (${this.t().ends})`
            },
            roomIndex,
            startMinutes: startMinutesFromGridStart,
            durationMinutes: durMinutes,
            topPx,
            heightPx,
            leftStyle,
            rightStyle,
            widthStyle
          });
        }
      } else {
        // Normal booking (same day)
        if (resDateISO !== selectedDateISO) continue;

        const startMinutesFromGridStart = startMins;
        const durMinutes = endMins - startMins;

        const topPx = (startMinutesFromGridStart / 60) * this.rowHeight;
        const heightPx = (durMinutes / 60) * this.rowHeight;

        blocks.push({
          reservation: res,
          roomIndex,
          startMinutes: startMinutesFromGridStart,
          durationMinutes: durMinutes,
          topPx,
          heightPx,
          leftStyle,
          rightStyle,
          widthStyle
        });
      }
    }

    return blocks;
  });

  ngOnInit(): void {
    document.addEventListener('keydown', this.handleKeyDown);
    this.workspaceService.loadFromBackend();
    this.classroomService.loadRooms().subscribe();
    this.classroomService.loadInstructors().subscribe();
    this.classroomService.loadReservations().subscribe();
    this.timerHandle = setInterval(() => {
      this.classroomService.refreshCardsStatus(this.isArabic());
    }, 5000);
  }

  ngAfterViewInit(): void {
    // Initial comfortable scroll position to 08:00 AM
    setTimeout(() => {
      if (this.scheduleScrollRef?.nativeElement) {
        this.scheduleScrollRef.nativeElement.scrollTop = 8 * this.rowHeight; // 384px to 08:00 AM
      }
    }, 100);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.isDetailPanelOpen()) {
      this.closeDetailPanel();
    }
  };

  private convert12hTo24h(timeStr?: string): string {
    if (!timeStr) return '00:00';
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return '00:00';
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3]?.toUpperCase();
    if (period) {
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
    }
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  private mapCardToReservation(card: ClassroomCard): AdminReservation | null {
    if (!card || !card.id || !card.startTime) return null;
    const startTime24 = this.convert12hTo24h(card.startTime);
    const endTime24 = this.convert12hTo24h(card.endTime || card.startTime);

    let resStatus: 'active' | 'upcoming' | 'completed' | 'cancelled' = 'upcoming';
    if (card.status === 'active') resStatus = 'active';
    else if (card.status === 'completed') resStatus = 'completed';
    else if (card.status === 'cancelled') resStatus = 'cancelled';
    else if (card.status === 'scheduled') resStatus = 'upcoming';

    let colorTheme: 'yellow' | 'blue' | 'purple' | 'emerald' | 'orange' | 'rose' = 'blue';
    if (card.colorTheme === 'brown') colorTheme = 'yellow';
    else if (card.colorTheme === 'blue') colorTheme = 'blue';
    else if (card.colorTheme === 'purple') colorTheme = 'purple';
    else if (card.colorTheme === 'emerald') colorTheme = 'emerald';
    else if (card.colorTheme === 'orange') colorTheme = 'orange';
    else if (card.colorTheme === 'rose') colorTheme = 'rose';

    const bookingDateStr = card.bookingDate || this.classroomService.getTodayDateISO();
    const [year, month, day] = bookingDateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    const fullDateStr = dateObj.toLocaleDateString(
      this.isArabic() ? 'ar-u-nu-latn' : 'en-US',
      { month: 'long', day: 'numeric', year: 'numeric' }
    );

    return {
      id: card.id,
      isClassroomSession: true,
      displayId: card.id.startsWith('res-') ? card.id.toUpperCase() : `RES-${card.id.substring(0, 4).toUpperCase()}`,
      instructor: card.instructor,
      activity: card.activity,
      classroom: card.name,
      date: bookingDateStr === this.classroomService.getTodayDateISO() ? 'Today' : bookingDateStr,
      fullDate: fullDateStr,
      startTime: startTime24,
      endTime: endTime24,
      timeRange: `${startTime24} - ${endTime24}`,
      durationHours: card.durationHours || 2,
      cost: card.rental || 0,
      status: resStatus,
      colorTheme: colorTheme,
      costBreakdown: {
        baseRate: card.rental || 0,
        baseRateLabel: this.t().baseRateLabel,
        equipmentAddon: 0,
        earlyBirdDiscount: 0,
        total: card.rental || 0
      }
    };
  }

  // Date navigation
  prevDay(): void {
    const current = new Date(this.selectedDate());
    current.setDate(current.getDate() - 1);
    this.selectedDate.set(current);
  }

  nextDay(): void {
    const current = new Date(this.selectedDate());
    current.setDate(current.getDate() + 1);
    this.selectedDate.set(current);
  }

  // Side Drawer controls
  // Side Drawer controls
  openDetail(res: AdminReservation): void {
    this.selectedReservation.set(res);
    this.isDetailPanelOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeDetailPanel(): void {
    this.isDetailPanelOpen.set(false);
    this.selectedReservation.set(null);
    document.body.style.overflow = '';
  }

  onCheckoutReservation(res: AdminReservation): void {
    if (res.status === 'completed' || (res as any).isCheckedOut) {
      this.workspaceService.showToast(
        this.isArabic() ? 'هذا الحجز تم تسجيل المغادرة له بالفعل (Checked-Out)' : 'This reservation has already been checked out.',
        'info'
      );
      return;
    }
    this.closeDetailPanel();
    this.router.navigate(['/classroom/show-classroom'], {
      queryParams: { checkout: res.id }
    });
  }

  onEditReservation(res: AdminReservation): void {
    this.closeDetailPanel();
    this.requestEditReservation(res);
  }

  // ============================================================
  // FULL CRUD & DUPLICATE & SPLIT MODALS (ITEMS 24 & 25)
  // ============================================================
  isReservationModalOpen = signal(false);
  modalMode = signal<'new' | 'edit' | 'duplicate'>('new');
  modalErrorMessage = signal<string>('');
  resId = signal('');
  resRoomName = signal('');
  resInstructor = signal('');
  selectedInstructorId = signal('');
  isInstructorDropdownOpen = signal(false);
  resActivity = signal('');
  resDate = signal('');
  resStartHour = signal('09');
  resStartMinute = signal('00');
  resStartPeriod = signal<'AM' | 'PM'>('AM');
  resEndHour = signal('11');
  resEndMinute = signal('00');
  resEndPeriod = signal<'AM' | 'PM'>('AM');
  resHourlyRate = signal(40);
  isSaving = signal(false);

  // Recurring Cancellation Modal State
  isRecurringCancelModalOpen = signal(false);
  selectedRecurringRes = signal<AdminReservation | null>(null);
  recurringCancelScope = signal<'single' | 'all'>('single');
  isCancellingRecurring = signal(false);

  // Recurring Edit Scope Modal State
  isRecurringEditScopeModalOpen = signal(false);
  selectedRecurringEditRes = signal<AdminReservation | null>(null);
  recurringEditScope = signal<'single' | 'all'>('single');

  // Custom Delete Confirmation Modal State
  isDeleteModalOpen = signal<boolean>(false);
  reservationToDelete = signal<AdminReservation | null>(null);
  isDeleting = signal<boolean>(false);

  // Conflict Check Result State
  conflictDetails = signal<ReservationConflictCheckResultDto | null>(null);

  startSessionFromReservation(res: AdminReservation): void {
    this.closeActionMenu();
    this.closeDetailPanel();
    const effectiveResId = res.reservationId || res.id;
    const occDate = res.occurrenceDate || res.fullDate || this.classroomService.getTodayDateISO();
    const dateIso = new Date(occDate).toISOString();

    this.classroomService.createClassroomFromReservation(effectiveResId, {
      date: dateIso,
      expectedAttendees: res.capacity || 20,
      note: `بدء جلسة من حجز ${res.classroom} - ${res.instructor}`
    }).subscribe({
      next: () => {
        this.workspaceService.showToast(
          this.isArabic() ? `تم بدء جلسة القاعة (${res.classroom}) بنجاح!` : `Classroom session started for ${res.classroom}!`,
          'success'
        );
        this.classroomService.syncWithBackend();
      },
      error: (err) => {
        const msg = err?.error?.message || (this.isArabic() ? 'فشل بدء جلسة القاعة من الحجز' : 'Failed to start session');
        this.workspaceService.showToast(msg, 'error');
      }
    });
  }

  // Recurrence & All-Day State for Modal (Google Calendar style)
  isAllDay = signal<boolean>(false);
  repeatOption = signal<'none' | 'daily' | 'weekly' | 'monthly' | 'weekdays' | 'custom'>('none');
  isRecurrenceDropdownOpen = signal<boolean>(false);
  repeatOccurrences = signal<number>(4);

  dayOfWeekName = computed<string>(() => {
    const dStr = this.resDate();
    if (!dStr) return this.isArabic() ? 'الأربعاء' : 'Wednesday';
    const [y, m, d] = dStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(this.isArabic() ? 'ar-u-nu-latn' : 'en-US', { weekday: 'long' });
  });

  formattedDateDisplay = computed<string>(() => {
    const dStr = this.resDate();
    if (!dStr) return '';
    const [y, m, d] = dStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(this.isArabic() ? 'ar-u-nu-latn' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  });

  recurrenceLabel = computed<string>(() => {
    const opt = this.repeatOption();
    const day = this.dayOfWeekName();
    const isAr = this.isArabic();
    switch (opt) {
      case 'daily':
        return isAr ? 'يوميًا (Daily)' : 'Daily';
      case 'weekly':
        return isAr ? `أسبوعيًا كل يوم ${day} (Weekly)` : `Weekly on ${day}`;
      case 'monthly':
        return isAr ? 'شهريًا في نفس اليوم (Monthly)' : 'Monthly';
      case 'weekdays':
        return isAr ? 'كل أيام العمل (أحد - خميس)' : 'Every weekday (Mon - Fri)';
      case 'custom':
        return this.customRecurrenceSummaryText() || (isAr ? 'تكرار مخصص...' : 'Custom...');
      default:
        return isAr ? 'لا يتكرر (Does not repeat)' : 'Does not repeat';
    }
  });

  isCustomRecurrenceModalOpen = signal(false);

  customRecurrence = signal<{
    interval: number;
    unit: 'day' | 'week' | 'month';
    daysOfWeek: number[];
    endType: 'never' | 'on_date' | 'after';
    occurrences: number;
    endDate: string;
  }>({
    interval: 1,
    unit: 'week',
    daysOfWeek: [3],
    endType: 'after',
    occurrences: 8,
    endDate: ''
  });

  weekDaysList = [
    { value: 6, label: 'س', labelEn: 'S', fullName: 'السبت', fullNameEn: 'Saturday' },
    { value: 0, label: 'ح', labelEn: 'S', fullName: 'الأحد', fullNameEn: 'Sunday' },
    { value: 1, label: 'ن', labelEn: 'M', fullName: 'الاثنين', fullNameEn: 'Monday' },
    { value: 2, label: 'ث', labelEn: 'T', fullName: 'الثلاثاء', fullNameEn: 'Tuesday' },
    { value: 3, label: 'ر', labelEn: 'W', fullName: 'الأربعاء', fullNameEn: 'Wednesday' },
    { value: 4, label: 'خ', labelEn: 'T', fullName: 'الخميس', fullNameEn: 'Thursday' },
    { value: 5, label: 'ج', labelEn: 'F', fullName: 'الجمعة', fullNameEn: 'Friday' },
  ];

  openCustomRecurrenceModal(): void {
    this.isRecurrenceDropdownOpen.set(false);
    const baseDateStr = this.resDate() || this.classroomService.getTodayDateISO();
    const [y, m, d] = baseDateStr.split('-').map(Number);
    const currDay = new Date(y, m - 1, d).getDay();

    this.customRecurrence.update(c => ({
      ...c,
      unit: c.unit || 'week',
      endType: c.endType || 'after',
      occurrences: c.occurrences || 8,
      daysOfWeek: c.daysOfWeek && c.daysOfWeek.length > 0 ? c.daysOfWeek : [currDay]
    }));

    this.isCustomRecurrenceModalOpen.set(true);
  }

  closeCustomRecurrenceModal(): void {
    this.isCustomRecurrenceModalOpen.set(false);
  }

  saveCustomRecurrence(): void {
    this.repeatOption.set('custom');
    this.isCustomRecurrenceModalOpen.set(false);
  }

  setCustomOccurrencesPreset(count: number): void {
    this.customRecurrence.update(c => ({
      ...c,
      endType: 'after',
      occurrences: count
    }));
  }

  adjustCustomOccurrences(delta: number): void {
    this.customRecurrence.update(c => ({
      ...c,
      endType: 'after',
      occurrences: Math.max(1, Math.min(60, (c.occurrences || 8) + delta))
    }));
  }

  upcomingRecurrenceDatesPreview = computed<{ label: string; index: number }[]>(() => {
    const dates = this.generatedRecurrenceDates();
    const isAr = this.isArabic();
    return dates.slice(0, 5).map((dStr, idx) => {
      const [y, m, d] = dStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const dayName = dt.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short' });
      const datePart = dt.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' });
      return {
        index: idx + 1,
        label: `${dayName} ${datePart}`
      };
    });
  });

  customTotalCostPreview = computed<number>(() => {
    const totalSessions = this.generatedRecurrenceDates().length;
    const durHours = 2;
    const rate = this.resHourlyRate() || 40;
    return totalSessions * durHours * rate;
  });

  toggleCustomDay(dayVal: number): void {
    this.customRecurrence.update(curr => {
      const exists = curr.daysOfWeek.includes(dayVal);
      let updated: number[];
      if (exists) {
        updated = curr.daysOfWeek.length > 1 ? curr.daysOfWeek.filter(d => d !== dayVal) : curr.daysOfWeek;
      } else {
        updated = [...curr.daysOfWeek, dayVal].sort();
      }
      return { ...curr, daysOfWeek: updated };
    });
  }

  isDaySelected(dayVal: number): boolean {
    return this.customRecurrence().daysOfWeek.includes(dayVal);
  }

  updateCustomInterval(val: any): void {
    const num = Math.max(1, Math.min(99, parseInt(val, 10) || 1));
    this.customRecurrence.update(c => ({ ...c, interval: num }));
  }

  updateCustomUnit(unit: 'day' | 'week' | 'month'): void {
    this.customRecurrence.update(c => ({ ...c, unit }));
  }

  updateCustomEndType(endType: 'never' | 'on_date' | 'after'): void {
    this.customRecurrence.update(c => ({ ...c, endType }));
  }

  updateCustomOccurrences(val: any): void {
    const num = Math.max(1, Math.min(50, parseInt(val, 10) || 1));
    this.customRecurrence.update(c => ({ ...c, occurrences: num }));
  }

  updateCustomEndDate(dateStr: string): void {
    this.customRecurrence.update(c => ({ ...c, endDate: dateStr }));
  }

  customRecurrenceSummaryText = computed(() => {
    const c = this.customRecurrence();
    const isAr = this.isArabic();
    let text = '';

    if (c.interval === 1) {
      if (c.unit === 'day') text = isAr ? 'يومياً' : 'Daily';
      else if (c.unit === 'week') text = isAr ? 'أسبوعياً' : 'Weekly';
      else if (c.unit === 'month') text = isAr ? 'شهرياً' : 'Monthly';
    } else {
      if (c.unit === 'day') text = isAr ? `كل ${c.interval} أيام` : `Every ${c.interval} days`;
      else if (c.unit === 'week') text = isAr ? `كل ${c.interval} أسابيع` : `Every ${c.interval} weeks`;
      else if (c.unit === 'month') text = isAr ? `كل ${c.interval} أشهر` : `Every ${c.interval} months`;
    }

    if (c.unit === 'week' && c.daysOfWeek.length > 0) {
      const dayNames = c.daysOfWeek
        .map(dVal => this.weekDaysList.find(w => w.value === dVal))
        .filter(Boolean)
        .map(w => isAr ? w!.fullName : w!.fullNameEn);
      text += isAr ? ` في أيام ${dayNames.join('، ')}` : ` on ${dayNames.join(', ')}`;
    }

    if (c.endType === 'after') {
      text += isAr ? ` (${c.occurrences} مواعيد)` : ` (${c.occurrences} occurrences)`;
    } else if (c.endType === 'on_date' && c.endDate) {
      text += isAr ? ` حتى ${c.endDate}` : ` until ${c.endDate}`;
    }

    return text;
  });

  generatedRecurrenceDates = computed<string[]>(() => {
    const opt = this.repeatOption();
    const baseDateStr = this.resDate() || this.classroomService.getTodayDateISO();
    if (opt === 'none') {
      return [baseDateStr];
    }

    const [by, bm, bd] = baseDateStr.split('-').map(Number);
    const baseDate = new Date(by, bm - 1, bd);
    const dates: string[] = [baseDateStr];

    if (opt === 'daily') {
      const count = this.repeatOccurrences() || 7;
      for (let i = 1; i < count; i++) {
        const next = new Date(baseDate);
        next.setDate(baseDate.getDate() + i);
        dates.push(this.formatDateToISO(next));
      }
    } else if (opt === 'weekly') {
      const count = this.repeatOccurrences() || 4;
      for (let i = 1; i < count; i++) {
        const next = new Date(baseDate);
        next.setDate(baseDate.getDate() + (i * 7));
        dates.push(this.formatDateToISO(next));
      }
    } else if (opt === 'monthly') {
      const count = this.repeatOccurrences() || 3;
      for (let i = 1; i < count; i++) {
        const next = new Date(baseDate);
        next.setMonth(baseDate.getMonth() + i);
        dates.push(this.formatDateToISO(next));
      }
    } else if (opt === 'weekdays') {
      const count = this.repeatOccurrences() || 5;
      let added = 1;
      let dayOffset = 1;
      while (added < count && dayOffset < 60) {
        const next = new Date(baseDate);
        next.setDate(baseDate.getDate() + dayOffset);
        const dow = next.getDay();
        if (dow !== 5 && dow !== 6) {
          dates.push(this.formatDateToISO(next));
          added++;
        }
        dayOffset++;
      }
    } else if (opt === 'custom') {
      const c = this.customRecurrence();
      const targetCount = c.endType === 'after' ? c.occurrences : (c.endType === 'never' ? 12 : 50);
      const untilDate = c.endType === 'on_date' && c.endDate ? new Date(c.endDate) : null;

      if (c.unit === 'day') {
        let i = 1;
        while (dates.length < targetCount && i < 100) {
          const next = new Date(baseDate);
          next.setDate(baseDate.getDate() + (i * c.interval));
          if (untilDate && next > untilDate) break;
          dates.push(this.formatDateToISO(next));
          i++;
        }
      } else if (c.unit === 'week') {
        const days = c.daysOfWeek && c.daysOfWeek.length > 0 ? c.daysOfWeek : [baseDate.getDay()];
        let dayStep = 1;

        while (dates.length < targetCount && dayStep < 365) {
          const checkDate = new Date(baseDate);
          checkDate.setDate(baseDate.getDate() + dayStep);

          if (untilDate && checkDate > untilDate) break;

          if (days.includes(checkDate.getDay())) {
            dates.push(this.formatDateToISO(checkDate));
          }
          dayStep++;
        }
      } else if (c.unit === 'month') {
        let i = 1;
        while (dates.length < targetCount && i < 36) {
          const next = new Date(baseDate);
          next.setMonth(baseDate.getMonth() + (i * c.interval));
          if (untilDate && next > untilDate) break;
          dates.push(this.formatDateToISO(next));
          i++;
        }
      }
    }

    return dates;
  });

  formatDateToISO(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  toggleAllDay(): void {
    const next = !this.isAllDay();
    this.isAllDay.set(next);
    if (next) {
      this.resStartHour.set('08');
      this.resStartMinute.set('00');
      this.resStartPeriod.set('AM');
      this.resEndHour.set('11');
      this.resEndMinute.set('59');
      this.resEndPeriod.set('PM');
    } else {
      this.setResTimeToNow();
    }
  }

  selectRepeatOption(opt: 'none' | 'daily' | 'weekly' | 'monthly' | 'weekdays' | 'custom'): void {
    if (opt === 'custom') {
      this.openCustomRecurrenceModal();
    } else {
      this.repeatOption.set(opt);
      this.isRecurrenceDropdownOpen.set(false);
    }
  }

  adjustRepeatOccurrences(delta: number): void {
    const curr = this.repeatOccurrences();
    const updated = Math.max(2, Math.min(30, curr + delta));
    this.repeatOccurrences.set(updated);
  }

  isStartTimeDropdownOpen = signal<boolean>(false);
  isEndTimeDropdownOpen = signal<boolean>(false);

  // 15-minute standard time slots: 12:00 AM to 11:45 PM
  timeSlotOptions = computed<string[]>(() => {
    const slots: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const period: 'AM' | 'PM' = h < 12 ? 'AM' : 'PM';
        let displayH = h % 12;
        if (displayH === 0) displayH = 12;
        const hStr = String(displayH).padStart(2, '0');
        const mStr = String(m).padStart(2, '0');
        slots.push(`${hStr}:${mStr} ${period}`);
      }
    }
    return slots;
  });

  // End time options with duration labels relative to start time
  endTimeSlotOptions = computed<{ time: string; durationLabel: string }[]>(() => {
    const startTimeStr = this.resStartTime();
    const startMins = startTimeStr ? this.classroomService.parseTimeToMinutes(startTimeStr) : 540; // 09:00 AM
    const slots: { time: string; durationLabel: string }[] = [];
    const isAr = this.isArabic();

    for (let offset = 15; offset <= 24 * 60; offset += 15) {
      const endMins = (startMins + offset) % (24 * 60);
      const h24 = Math.floor(endMins / 60);
      const m = endMins % 60;
      const period: 'AM' | 'PM' = h24 < 12 ? 'AM' : 'PM';
      let displayH = h24 % 12;
      if (displayH === 0) displayH = 12;
      const hStr = String(displayH).padStart(2, '0');
      const mStr = String(m).padStart(2, '0');
      const timeStr = `${hStr}:${mStr} ${period}`;

      let durLabel = '';
      if (offset < 60) {
        durLabel = isAr ? `(${offset} دقيقة)` : `(${offset} mins)`;
      } else {
        const fullH = Math.floor(offset / 60);
        const remM = offset % 60;
        if (remM === 0) {
          durLabel = isAr ? `(${fullH} ساعة)` : `(${fullH} hr${fullH > 1 ? 's' : ''})`;
        } else {
          durLabel = isAr ? `(${fullH} س و ${remM} د)` : `(${fullH} hr ${remM} m)`;
        }
      }

      slots.push({ time: timeStr, durationLabel: durLabel });
    }
    return slots;
  });

  selectStartTime(timeStr: string): void {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      this.resStartHour.set(match[1]);
      this.resStartMinute.set(match[2]);
      this.resStartPeriod.set(match[3].toUpperCase() as 'AM' | 'PM');
    }
    this.isStartTimeDropdownOpen.set(false);

    // Auto adjust end time if empty or if currently before/equal to start
    const sMins = this.classroomService.parseTimeToMinutes(timeStr);
    const currEMins = this.resEndTime() ? this.classroomService.parseTimeToMinutes(this.resEndTime()) : 0;
    if (!this.resEndTime() || currEMins <= sMins) {
      const newEMins = (sMins + 120) % (24 * 60); // default +2 hours
      const eH24 = Math.floor(newEMins / 60);
      const eM = newEMins % 60;
      const ePer: 'AM' | 'PM' = eH24 < 12 ? 'AM' : 'PM';
      let displayH = eH24 % 12;
      if (displayH === 0) displayH = 12;
      this.resEndHour.set(String(displayH).padStart(2, '0'));
      this.resEndMinute.set(String(eM).padStart(2, '0'));
      this.resEndPeriod.set(ePer);
    }
  }

  selectEndTime(timeStr: string): void {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      this.resEndHour.set(match[1]);
      this.resEndMinute.set(match[2]);
      this.resEndPeriod.set(match[3].toUpperCase() as 'AM' | 'PM');
    }
    this.isEndTimeDropdownOpen.set(false);
  }

  openDatePicker(picker: HTMLInputElement): void {
    try {
      if (typeof picker.showPicker === 'function') {
        picker.showPicker();
        return;
      }
    } catch {
      // Fallback
    }
    picker.focus();
  }

  onStartTimeDirectChange(val: string): void {
    if (!val) return;
    const match = val.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      this.resStartHour.set(match[1].padStart(2, '0'));
      this.resStartMinute.set(match[2]);
      if (match[3]) {
        this.resStartPeriod.set(match[3].toUpperCase() as 'AM' | 'PM');
      }
    }
  }

  onEndTimeDirectChange(val: string): void {
    if (!val) return;
    const match = val.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      this.resEndHour.set(match[1].padStart(2, '0'));
      this.resEndMinute.set(match[2]);
      if (match[3]) {
        this.resEndPeriod.set(match[3].toUpperCase() as 'AM' | 'PM');
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.instructor-autocomplete-wrap')) {
      this.isInstructorDropdownOpen.set(false);
    }
    if (!target.closest('.recurrence-dropdown-wrap')) {
      this.isRecurrenceDropdownOpen.set(false);
    }
    if (!target.closest('.cal-time-chip--start')) {
      this.isStartTimeDropdownOpen.set(false);
    }
    if (!target.closest('.cal-time-chip--end')) {
      this.isEndTimeDropdownOpen.set(false);
    }
    if (!target.closest('.action-menu-wrap')) {
      this.closeActionMenu();
    }
  }

  resStartTime = computed(() => {
    const h = (this.resStartHour() || '09').padStart(2, '0');
    const m = (this.resStartMinute() || '00').padStart(2, '0');
    return `${h}:${m} ${this.resStartPeriod()}`;
  });

  resEndTime = computed(() => {
    const h = (this.resEndHour() || '11').padStart(2, '0');
    const m = (this.resEndMinute() || '00').padStart(2, '0');
    return `${h}:${m} ${this.resEndPeriod()}`;
  });

  resDurationHours = computed(() => {
    const sMins = this.classroomService.parseTimeToMinutes(this.resStartTime());
    const eMins = this.classroomService.parseTimeToMinutes(this.resEndTime());
    if (eMins <= sMins) {
      // crossover midnight
      const diff = (24 * 60 - sMins) + eMins;
      return +(diff / 60).toFixed(1);
    }
    return +((eMins - sMins) / 60).toFixed(1);
  });

  resTotalCost = computed(() => {
    const rate = Number(this.resHourlyRate()) || 0;
    const dur = this.resDurationHours();
    return +(dur * rate).toFixed(2);
  });

  instructorOptions = computed(() => {
    const q = this.resInstructor().trim().toLowerCase();
    const list = (this.classroomService.instructors() || []).filter(
      i => !this.workspaceService.isStudentBlacklisted(i.name, i.phoneNumber || i.phone, i.id)
    );
    if (!q) return list;
    return list.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.phoneNumber || '').includes(q)
    );
  });

  isCurrentInstructorBlacklisted = computed(() => {
    const name = this.resInstructor().trim();
    const id = this.selectedInstructorId();
    if (!name && !id) return false;
    return this.workspaceService.isStudentBlacklisted(name, undefined, id);
  });

  selectInstructor(ins: any): void {
    this.resInstructor.set(ins.name || '');
    this.selectedInstructorId.set(ins.id || '');
    this.isInstructorDropdownOpen.set(false);
  }

  clearInstructor(): void {
    this.resInstructor.set('');
    this.selectedInstructorId.set('');
    this.isInstructorDropdownOpen.set(false);
  }

  onRoomChange(roomName: string): void {
    this.resRoomName.set(roomName);
    const room = this.rooms().find(r => r.name.toLowerCase() === roomName.toLowerCase() || r.id === roomName);
    if (room && room.hourlyRate) {
      this.resHourlyRate.set(room.hourlyRate);
    }
  }

  setResTimeToNow(): void {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;

    this.resStartHour.set(String(hours).padStart(2, '0'));
    this.resStartMinute.set(String(minutes).padStart(2, '0'));
    this.resStartPeriod.set(period);

    const endTotalH = now.getHours() + 2;
    let endH = endTotalH % 12;
    if (endH === 0) endH = 12;
    const endPer: 'AM' | 'PM' = (endTotalH % 24) >= 12 ? 'PM' : 'AM';
    this.resEndHour.set(String(endH).padStart(2, '0'));
    this.resEndMinute.set(String(minutes).padStart(2, '0'));
    this.resEndPeriod.set(endPer);
  }

  isReservationFormValid = computed(() => {
    const hasRoom = !!this.resRoomName().trim();
    const hasInstructor = !!this.resInstructor().trim() && this.resInstructor().trim().length >= 2;
    const hasActivity = !!this.resActivity().trim() && this.resActivity().trim().length >= 2;
    const hasDate = !!this.resDate().trim();
    const hasRate = Number(this.resHourlyRate()) > 0;
    const hasDur = this.resDurationHours() > 0;
    const notBlacklisted = !this.isCurrentInstructorBlacklisted();
    return hasRoom && hasInstructor && hasActivity && hasDate && hasRate && hasDur && !this.isSaving() && notBlacklisted;
  });

  // Split Modal
  isSplitModalOpen = signal(false);
  splitTarget = signal<AdminReservation | null>(null);
  cutStartTime = signal('12:00 PM');
  cutEndTime = signal('01:00 PM');

  openNewReservationModal(): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'حجز قاعة' : 'Classroom Reservation')) {
      return;
    }
    this.modalMode.set('new');
    this.resId.set('');
    const firstRoom = this.rooms()[0];
    this.resRoomName.set(firstRoom?.name || 'Nook Hall');
    this.resInstructor.set('');
    this.selectedInstructorId.set('');
    this.isInstructorDropdownOpen.set(false);
    this.resActivity.set('');

    const d = this.selectedDate();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    this.resDate.set(`${y}-${m}-${day}`);

    this.setResTimeToNow();
    this.resHourlyRate.set(firstRoom?.hourlyRate || 40);

    // Reset recurrence state
    this.isAllDay.set(false);
    this.repeatOption.set('none');
    this.repeatOccurrences.set(4);
    this.isRecurrenceDropdownOpen.set(false);

    this.isReservationModalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  requestEditReservation(res: AdminReservation): void {
    if (res.isRecurring) {
      this.selectedRecurringEditRes.set(res);
      this.recurringEditScope.set('single');
      this.isRecurringEditScopeModalOpen.set(true);
    } else {
      this.openEditReservationModal(res);
    }
  }

  proceedWithRecurringEdit(): void {
    const res = this.selectedRecurringEditRes();
    if (!res) return;
    this.isRecurringEditScopeModalOpen.set(false);
    this.openEditReservationModal(res);
  }

  closeRecurringEditScopeModal(): void {
    this.isRecurringEditScopeModalOpen.set(false);
    this.selectedRecurringEditRes.set(null);
  }

  openEditReservationModal(res: AdminReservation): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'تعديل الحجز' : 'Edit Reservation')) {
      return;
    }
    this.modalMode.set('edit');
    this.resId.set(res.id);
    this.resRoomName.set(res.classroom);
    this.resInstructor.set(res.instructor);
    this.selectedInstructorId.set('');
    this.isInstructorDropdownOpen.set(false);
    this.resActivity.set(res.activity);
    this.conflictDetails.set(null);
    this.modalErrorMessage.set('');

    const targetDate = res.occurrenceDate || (res.date === 'Today' ? this.classroomService.getTodayDateISO() : (res.date || this.classroomService.getTodayDateISO()));
    this.resDate.set(targetDate);

    // If editing a single occurrence from a series, lock recurrence to 'none'
    if (this.recurringEditScope() === 'single' && res.isRecurring) {
      this.isAllDay.set(false);
      this.repeatOption.set('none');
      this.repeatOccurrences.set(4);
      this.isRecurrenceDropdownOpen.set(false);
    } else if (res.isRecurring) {
      this.isAllDay.set(false);
      const freq = res.recurrenceFrequency;
      this.repeatOption.set(freq === 1 ? 'daily' : (freq === 3 ? 'monthly' : 'weekly'));
      this.repeatOccurrences.set(res.totalSessions || 4);
      this.isRecurrenceDropdownOpen.set(false);
    } else {
      this.isAllDay.set(false);
      this.repeatOption.set('none');
      this.repeatOccurrences.set(4);
      this.isRecurrenceDropdownOpen.set(false);
    }

    if (res.startTime) {
      const matchStart = res.startTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (matchStart) {
        let h = parseInt(matchStart[1], 10);
        const min = matchStart[2];
        let p: 'AM' | 'PM' = (matchStart[3]?.toUpperCase() as 'AM' | 'PM') || 'AM';
        if (!matchStart[3]) {
          if (h >= 12) {
            p = 'PM';
            if (h > 12) h -= 12;
          } else if (h === 0) {
            h = 12;
          }
        }
        this.resStartHour.set(String(h).padStart(2, '0'));
        this.resStartMinute.set(min);
        this.resStartPeriod.set(p);
      }
    }

    if (res.endTime) {
      const matchEnd = res.endTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (matchEnd) {
        let h = parseInt(matchEnd[1], 10);
        const min = matchEnd[2];
        let p: 'AM' | 'PM' = (matchEnd[3]?.toUpperCase() as 'AM' | 'PM') || 'AM';
        if (!matchEnd[3]) {
          if (h >= 12) {
            p = 'PM';
            if (h > 12) h -= 12;
          } else if (h === 0) {
            h = 12;
          }
        }
        this.resEndHour.set(String(h).padStart(2, '0'));
        this.resEndMinute.set(min);
        this.resEndPeriod.set(p);
      }
    }

    const roomMatch = this.rooms().find(r => r.name.toLowerCase() === (res.classroom || '').toLowerCase() || r.id === res.classroom);
    const calculatedRate = (res.durationHours && res.durationHours > 0 && res.cost) ? Math.round(res.cost / res.durationHours) : (roomMatch?.hourlyRate || 40);
    this.resHourlyRate.set(calculatedRate || 40);

    this.isReservationModalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  duplicateReservation(res: AdminReservation): void {
    this.openEditReservationModal(res);
    this.modalMode.set('duplicate');
    this.resId.set('');
    this.selectedRecurringEditRes.set(null);
    this.resActivity.set(res.activity + ' ' + this.t().copySuffix);
    this.resDate.set(this.classroomService.getTodayDateISO());
  }

  closeReservationModal(): void {
    this.isReservationModalOpen.set(false);
    this.isInstructorDropdownOpen.set(false);
    this.isRecurrenceDropdownOpen.set(false);
    this.selectedRecurringEditRes.set(null);
    this.conflictDetails.set(null);
    document.body.style.overflow = '';
  }

  saveReservation(): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'حفظ الحجز' : 'Save Reservation')) {
      return;
    }
    if (this.isCurrentInstructorBlacklisted()) {
      this.workspaceService.showToast(
        this.isArabic()
          ? `لا يمكن إتمام الحجز: العميل "${this.resInstructor()}" محظور في القائمة السوداء (Blacklist)!`
          : `Reservation denied: "${this.resInstructor()}" is blacklisted!`,
        'error'
      );
      this.isSaving.set(false);
      return;
    }
    if (!this.isReservationFormValid()) return;
    this.isSaving.set(true);
    this.modalErrorMessage.set('');
    this.conflictDetails.set(null);

    const instructor = this.resInstructor().trim();
    const activity = this.resActivity().trim();
    const totalCost = this.resTotalCost();
    const startTimeStr = this.resStartTime();
    const endTimeStr = this.resEndTime();
    const dateStr = this.resDate();
    const roomMatch = this.rooms().find(r => r.name.toLowerCase() === this.resRoomName().toLowerCase() || r.id === this.resRoomName());
    const realRoomId = roomMatch?.id || this.resRoomName();

    const [y, m, d] = dateStr.split('-').map(Number);
    const currDay = new Date(y, m - 1, d).getDay();
    const opt = this.repeatOption();

    let freq: number | undefined = undefined;
    let interval = 1;
    let daysOfWeek: number[] = [currDay];
    let totalSessions: number | undefined = undefined;
    let isOngoing = false;
    let endDateStr = dateStr;

    if (opt === 'daily') {
      freq = 1;
      interval = 1;
      daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
      totalSessions = this.repeatOccurrences() || 7;
      endDateStr = this.computeEndDate(dateStr, totalSessions, 'day', 1);
    } else if (opt === 'weekly') {
      freq = 2;
      interval = 1;
      daysOfWeek = [currDay];
      totalSessions = this.repeatOccurrences() || 4;
      endDateStr = this.computeEndDate(dateStr, totalSessions, 'week', 1);
    } else if (opt === 'monthly') {
      freq = 3;
      interval = 1;
      daysOfWeek = [currDay];
      totalSessions = this.repeatOccurrences() || 3;
      endDateStr = this.computeEndDate(dateStr, totalSessions, 'month', 1);
    } else if (opt === 'weekdays') {
      freq = 2;
      interval = 1;
      daysOfWeek = [0, 1, 2, 3, 4];
      totalSessions = this.repeatOccurrences() || 5;
      endDateStr = this.computeEndDate(dateStr, totalSessions, 'week', 1);
    } else if (opt === 'custom') {
      const c = this.customRecurrence();
      freq = c.unit === 'day' ? 1 : (c.unit === 'month' ? 3 : 2);
      interval = c.interval || 1;
      daysOfWeek = c.daysOfWeek && c.daysOfWeek.length > 0 ? c.daysOfWeek : [currDay];
      if (c.endType === 'never') {
        isOngoing = true;
        totalSessions = undefined;
        endDateStr = this.computeEndDate(dateStr, 52, 'week', 1);
      } else if (c.endType === 'after') {
        isOngoing = false;
        totalSessions = c.occurrences || 8;
        endDateStr = this.computeEndDate(dateStr, totalSessions, c.unit, interval);
      } else if (c.endType === 'on_date') {
        isOngoing = false;
        endDateStr = c.endDate || dateStr;
      }
    }

    const isoDateFrom = new Date(dateStr).toISOString();
    const isoDateTo = new Date(endDateStr).toISOString();
    const isoTimeFrom = this.convertTimeToISO(startTimeStr, dateStr);
    const isoTimeTo = this.convertTimeToISO(endTimeStr, dateStr);

    const handleSaveError = (e: any, defaultMsg: string) => {
      this.isSaving.set(false);
      let msg = defaultMsg;
      if (e?.status === 409) {
        msg = this.isArabic() ? 'تعارض في الموعد: هذه القاعة محجوزة بالفعل في هذا التوقيت.' : 'Conflict: Room is already booked for this time slot.';
      } else if (e?.error?.message) {
        msg = e.error.message;
      }
      this.modalErrorMessage.set(msg);
      this.workspaceService.showToast(msg, 'error');
    };

    const executeSave = () => {
      if (this.modalMode() === 'edit' && this.resId()) {
        const targetRes = this.selectedRecurringEditRes();
        if (this.recurringEditScope() === 'single' && targetRes && targetRes.isRecurring) {
          // Edit SINGLE occurrence from a recurring series:
          // 1. Cancel this day from the recurring series
          // 2. Create a standalone reservation for this specific date
          const occDate = targetRes.occurrenceDate || targetRes.fullDate;
          const occIso = new Date(occDate).toISOString();
          const seriesId = targetRes.reservationId || targetRes.id;

          this.classroomService.cancelReservationDay(seriesId, {
            date: occIso,
            reason: 'تعديل موعد فردي من السلسلة'
          }).subscribe({
            next: () => {
              this.classroomService.createReservation({
                roomId: realRoomId,
                roomName: this.resRoomName(),
                instructorId: this.selectedInstructorId() || undefined,
                instructorName: instructor,
                activity,
                dateFrom: dateStr,
                dateTo: dateStr,
                timeFrom: startTimeStr,
                timeTo: endTimeStr,
                reservationCost: totalCost
              }).subscribe({
                next: () => {
                  this.isSaving.set(false);
                  this.closeReservationModal();
                  this.workspaceService.showToast(
                    this.isArabic() ? 'تم تطبيق التعديل على هذا الموعد بنجاح' : 'Occurrence updated successfully',
                    'success'
                  );
                  this.classroomService.syncWithBackend();
                },
                error: (e) => handleSaveError(e, this.isArabic() ? 'فشل حفظ الموعد المعدل' : 'Failed to save updated occurrence')
              });
            },
            error: (e) => handleSaveError(e, this.isArabic() ? 'فشل استبعاد الموعد القديم من السلسلة' : 'Failed to update occurrence in series')
          });
        } else {
          // Edit entire series or standalone reservation
          const effectiveId = targetRes?.reservationId || this.resId();
          this.classroomService.updateReservation(effectiveId, {
            roomName: this.resRoomName(),
            instructorId: this.selectedInstructorId() || undefined,
            instructorName: instructor,
            activity,
            dateFrom: dateStr,
            dateTo: endDateStr,
            timeFrom: startTimeStr,
            timeTo: endTimeStr,
            reservationCost: totalCost,
            recurrenceFrequency: freq,
            recurrenceInterval: interval,
            daysOfWeek: daysOfWeek,
            totalSessions: totalSessions,
            isOngoing: isOngoing
          }).subscribe({
            next: () => {
              this.isSaving.set(false);
              this.closeReservationModal();
              this.workspaceService.showToast(this.isArabic() ? 'تم تعديل السلسلة بنجاح' : 'Reservation series updated successfully', 'success');
              this.classroomService.syncWithBackend();
            },
            error: (e) => handleSaveError(e, this.isArabic() ? 'فشل تعديل الحجز' : 'Failed to update reservation')
          });
        }
      } else {
        // Create new (single or recurring)
        this.classroomService.createReservation({
          roomId: realRoomId,
          roomName: this.resRoomName(),
          instructorId: this.selectedInstructorId() || undefined,
          instructorName: instructor,
          activity,
          dateFrom: dateStr,
          dateTo: endDateStr,
          timeFrom: startTimeStr,
          timeTo: endTimeStr,
          reservationCost: totalCost,
          recurrenceFrequency: freq,
          recurrenceInterval: interval,
          daysOfWeek: daysOfWeek,
          totalSessions: totalSessions,
          isOngoing: isOngoing
        }).subscribe({
          next: () => {
            this.isSaving.set(false);
            this.closeReservationModal();
            const successMsg = freq
              ? (this.isArabic() ? `تم إنشاء الحجز الدوري بنجاح (${this.recurrenceLabel()})` : 'Recurring reservation created successfully')
              : (this.isArabic() ? 'تم إضافة الحجز بنجاح' : 'Reservation created successfully');
            this.workspaceService.showToast(successMsg, 'success');
            this.classroomService.syncWithBackend();
          },
          error: (e) => handleSaveError(e, this.isArabic() ? 'فشل إضافة الحجز' : 'Failed to create reservation')
        });
      }
    };

    // Generate dates list for conflict checking
    const targetDates: string[] = [];
    if (!freq) {
      targetDates.push(dateStr);
    } else {
      const maxSessions = totalSessions || 8;
      const [startYear, startMonth, startDay] = dateStr.split('-').map(Number);
      const curr = new Date(startYear, startMonth - 1, startDay);
      const endLimit = new Date(endDateStr);
      let sessionCount = 0;

      while (sessionCount < maxSessions && curr <= endLimit) {
        const yStr = curr.getFullYear();
        const mStr = String(curr.getMonth() + 1).padStart(2, '0');
        const dStr = String(curr.getDate()).padStart(2, '0');
        const isoD = `${yStr}-${mStr}-${dStr}`;
        const dayNum = curr.getDay();

        if (daysOfWeek.includes(dayNum)) {
          targetDates.push(isoD);
          sessionCount++;
        }
        curr.setDate(curr.getDate() + 1);
      }
      if (targetDates.length === 0) targetDates.push(dateStr);
    }

    const targetRes = this.selectedRecurringEditRes();
    const excludeId = this.modalMode() === 'edit' ? (targetRes?.reservationId || this.resId() || null) : null;

    // Step 1: Pre-save In-Memory & Active Sessions Overlap Check (Strict Double Booking Prevention)
    const localConflict = this.findLocalReservationConflict(
      realRoomId,
      this.resRoomName(),
      targetDates,
      startTimeStr,
      endTimeStr,
      excludeId
    );

    if (localConflict.hasConflict) {
      this.isSaving.set(false);
      const msg = localConflict.reason || (this.isArabic() ? 'تعارض في الموعد: هذه القاعة محجوزة بالفعل في هذا التوقيت.' : 'Conflict: Room is already booked for this time slot.');
      this.modalErrorMessage.set(msg);
      this.workspaceService.showToast(msg, 'error');
      return;
    }

    // Step 2: Standalone Conflict Check via Backend API
    if (realRoomId && /^[0-9a-fA-F-]{36}$/.test(realRoomId)) {
      this.classroomService.checkReservationConflict({
        roomId: realRoomId,
        dateFrom: isoDateFrom,
        dateTo: isoDateTo,
        timeFrom: isoTimeFrom,
        timeTo: isoTimeTo,
        recurrenceFrequency: freq,
        recurrenceInterval: interval,
        daysOfWeek: daysOfWeek,
        totalSessions: totalSessions,
        isOngoing: isOngoing,
        excludeReservationId: excludeId
      }).subscribe({
        next: (conflictResult) => {
          if (conflictResult && conflictResult.hasConflict) {
            this.isSaving.set(false);
            this.conflictDetails.set(conflictResult);
            const msg = conflictResult.message || (this.isArabic() ? 'تم العثور على تعارض في المواعيد مع جلسات أخرى' : 'Conflict detected for scheduled dates');
            this.modalErrorMessage.set(msg);
            this.workspaceService.showToast(msg, 'error');
            return;
          }
          executeSave();
        },
        error: () => {
          // If conflict endpoint fails or is unreachable, proceed to save directly
          executeSave();
        }
      });
    } else {
      executeSave();
    }
  }

  findLocalReservationConflict(
    roomId: string,
    roomName: string,
    checkDates: string[],
    startTimeStr: string,
    endTimeStr: string,
    excludeResId?: string | null
  ): { hasConflict: boolean; reason?: string; conflictingDate?: string } {
    const newStart = this.classroomService.parseTimeToMinutes(startTimeStr);
    const newEnd = this.classroomService.parseTimeToMinutes(endTimeStr);
    if (newStart >= newEnd) return { hasConflict: false };

    const cleanRoomName = (roomName || '').trim().toLowerCase();
    const cleanRoomId = (roomId || '').trim().toLowerCase();

    const matchesRoom = (rId?: string, rName?: string) => {
      const id = (rId || '').trim().toLowerCase();
      const name = (rName || '').trim().toLowerCase();
      return (cleanRoomId && id && id === cleanRoomId) ||
             (cleanRoomName && name && (name === cleanRoomName || name.includes(cleanRoomName) || cleanRoomName.includes(name)));
    };

    const isExcluded = (id?: string, resId?: string) => {
      if (!excludeResId) return false;
      return id === excludeResId || resId === excludeResId;
    };

    // 1. Check existing reservations in calendar
    const existingList = this.reservations();
    for (const d of checkDates) {
      for (const res of existingList) {
        if (isExcluded(res.id, res.reservationId)) continue;
        if (res.status === 'cancelled') continue;
        if (!matchesRoom(res.roomId, res.roomName || res.classroom)) continue;

        const resDate = res.occurrenceDate || res.fullDate || res.date;
        if (!resDate || !resDate.startsWith(d)) continue;

        const exStart = this.classroomService.parseTimeToMinutes(res.startTime);
        const exEnd = this.classroomService.parseTimeToMinutes(res.endTime);
        if (exStart >= exEnd) continue;

        // Time Overlap: newStart < exEnd && newEnd > exStart
        if (newStart < exEnd && newEnd > exStart) {
          const conflictName = res.activity || res.instructor || 'حجز آخر';
          const conflictTime = `${res.startTime} - ${res.endTime}`;
          return {
            hasConflict: true,
            conflictingDate: d,
            reason: this.isArabic()
              ? `تعارض: القاعة محجوزة بالفعل بتاريخ ${d} في التوقيت (${conflictTime}) لـ "${conflictName}". لا يمكن تكرار الحجز.`
              : `Conflict: Room is already booked on ${d} at (${conflictTime}) for "${conflictName}". Double booking is not allowed.`
          };
        }
      }

      // 2. Check active classroom cards in space
      const activeCards = this.classroomService.cards();
      for (const card of activeCards) {
        if (card.status === 'available' || card.status === 'completed' || card.status === 'cancelled') continue;
        if (!matchesRoom(card.roomId, card.name)) continue;

        const cardDate = card.bookingDate;
        if (cardDate && !cardDate.startsWith(d)) continue;

        const cStart = this.classroomService.parseTimeToMinutes(card.startTime);
        const cEnd = this.classroomService.parseTimeToMinutes(card.endTime);
        if (cStart >= cEnd) continue;

        if (newStart < cEnd && newEnd > cStart) {
          return {
            hasConflict: true,
            conflictingDate: d,
            reason: this.isArabic()
              ? `تعارض: القاعة قيد الاستخدام حالياً في هذا التوقيت (${card.startTime} - ${card.endTime}) لـ "${card.instructor || card.activity || 'جلسة نشطة'}".`
              : `Conflict: Room is currently active at (${card.startTime} - ${card.endTime}) for "${card.instructor || 'Active Session'}".`
          };
        }
      }
    }

    return { hasConflict: false };
  }

  private computeEndDate(startDateStr: string, count: number, unit: 'day' | 'week' | 'month', interval: number): string {
    const [y, m, d] = startDateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (unit === 'day') {
      dt.setDate(dt.getDate() + (count - 1) * interval);
    } else if (unit === 'week') {
      dt.setDate(dt.getDate() + (count - 1) * 7 * interval);
    } else if (unit === 'month') {
      dt.setMonth(dt.getMonth() + (count - 1) * interval);
    }
    const ry = dt.getFullYear();
    const rm = String(dt.getMonth() + 1).padStart(2, '0');
    const rd = String(dt.getDate()).padStart(2, '0');
    return `${ry}-${rm}-${rd}`;
  }

  private convertTimeToISO(timeStr: string, dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const cleanTime = timeStr.trim();
    let hours = 9;
    let mins = 0;

    const match24 = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      hours = parseInt(match24[1], 10);
      mins = parseInt(match24[2], 10);
    } else {
      const match12 = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (match12) {
        hours = parseInt(match12[1], 10);
        mins = parseInt(match12[2], 10);
        const period = (match12[3] || 'AM').toUpperCase();
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
      }
    }
    dt.setHours(hours, mins, 0, 0);
    return dt.toISOString();
  }

  deleteReservation(res: AdminReservation): void {
    if (!res || (!res.id && !res.reservationId)) return;

    if (res.isRecurring) {
      this.selectedRecurringRes.set(res);
      this.recurringCancelScope.set('single');
      this.isRecurringCancelModalOpen.set(true);
      return;
    }

    this.reservationToDelete.set(res);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.reservationToDelete.set(null);
    this.isDeleting.set(false);
  }

  confirmDelete(): void {
    const res = this.reservationToDelete();
    if (!res) return;

    this.isDeleting.set(true);
    const isAr = this.isArabic();
    const isClassroom = res.isClassroomSession || !res.reservationId || this.classroomService.cards().some(c => c.id === res.id);

    const deleteObs$ = isClassroom
      ? this.classroomService.deleteBooking(res.id)
      : this.classroomService.deleteReservation(res.reservationId || res.id);

    deleteObs$.subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.workspaceService.showToast(isAr ? 'تم الحذف بنجاح' : 'Deleted successfully', 'success');
        this.classroomService.loadClassrooms().subscribe();
        this.classroomService.loadReservations().subscribe();
      },
      error: (e) => {
        // If 404, gracefully attempt the opposite endpoint in case of ID mix-up
        const fallback$ = isClassroom
          ? this.classroomService.deleteReservation(res.id)
          : this.classroomService.deleteBooking(res.id);

        fallback$.subscribe({
          next: () => {
            this.isDeleting.set(false);
            this.closeDeleteModal();
            this.workspaceService.showToast(isAr ? 'تم الحذف بنجاح' : 'Deleted successfully', 'success');
            this.classroomService.loadClassrooms().subscribe();
            this.classroomService.loadReservations().subscribe();
          },
          error: (err2) => {
            this.isDeleting.set(false);
            const msg = err2?.error?.message || e?.error?.message || (isAr ? 'فشل الحذف' : 'Failed to delete');
            this.workspaceService.showToast(msg, 'error');
          }
        });
      }
    });
  }

  confirmRecurringCancellation(): void {
    const res = this.selectedRecurringRes();
    if (!res) return;
    const isAr = this.isArabic();
    const targetId = res.reservationId || res.id;
    this.isCancellingRecurring.set(true);

    if (this.recurringCancelScope() === 'single') {
      const occDate = res.occurrenceDate || res.fullDate;
      const occIso = new Date(occDate).toISOString();
      this.classroomService.cancelReservationDay(targetId, {
        date: occIso,
        reason: 'إلغاء الموعد الفردي من قبل الإدارة'
      }).subscribe({
        next: () => {
          this.isCancellingRecurring.set(false);
          this.isRecurringCancelModalOpen.set(false);
          this.selectedRecurringRes.set(null);
          this.workspaceService.showToast(
            isAr ? `تم إلغاء موعد (${occDate}) من السلسلة بنجاح` : `Occurrence ${occDate} cancelled successfully`,
            'success'
          );
          this.classroomService.syncWithBackend();
        },
        error: (err) => {
          this.isCancellingRecurring.set(false);
          const msg = err?.error?.message || (isAr ? 'فشل إلغاء الموعد الفردي' : 'Failed to cancel occurrence');
          this.workspaceService.showToast(msg, 'error');
        }
      });
    } else {
      // Cancel entire series
      this.classroomService.deleteReservation(targetId).subscribe({
        next: () => {
          this.isCancellingRecurring.set(false);
          this.isRecurringCancelModalOpen.set(false);
          this.selectedRecurringRes.set(null);
          this.workspaceService.showToast(
            isAr ? 'تم إلغاء سلسلة الحجز بالكامل بنجاح' : 'Entire reservation series cancelled',
            'success'
          );
          this.classroomService.syncWithBackend();
        },
        error: (err) => {
          this.isCancellingRecurring.set(false);
          const msg = err?.error?.message || (isAr ? 'فشل إلغاء السلسلة' : 'Failed to cancel series');
          this.workspaceService.showToast(msg, 'error');
        }
      });
    }
  }

  closeRecurringCancelModal(): void {
    this.isRecurringCancelModalOpen.set(false);
    this.selectedRecurringRes.set(null);
  }

  openSplitModal(res: AdminReservation): void {
    this.splitTarget.set(res);
    this.cutStartTime.set(res.startTime);
    this.cutEndTime.set(res.endTime);
    this.isSplitModalOpen.set(true);
  }

  confirmSplit(): void {
    const target = this.splitTarget();
    if (!target) return;

    const success = this.classroomService.splitReservation(
      target.id,
      this.cutStartTime(),
      this.cutEndTime()
    );

    if (success) {
      this.isSplitModalOpen.set(false);
      this.splitTarget.set(null);
    } else {
      alert(this.t().cutSubRangeInvalid);
    }
  }
}
