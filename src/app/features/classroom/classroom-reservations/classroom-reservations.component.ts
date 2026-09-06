import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { ClassroomService } from '../../../core/services/classroom.service';
import {
  ClassroomCard,
  AdminReservation,
  AdminConsoleRoom,
  GridSlot,
  RenderedBlock
} from '../../../core/models/classroom.model';
import { FormsModule } from '@angular/forms';
import { ReservationDetailPanelComponent } from '../../../shared/components/reservation-detail-panel/reservation-detail-panel.component';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';
import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-classroom-reservations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReservationDetailPanelComponent,
    PrimaryButtonComponent,
    CustomSelectComponent
  ],
  templateUrl: './classroom-reservations.component.html',
  styleUrl: './classroom-reservations.component.css'
})
export class ClassroomReservationsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scheduleScroll') scheduleScrollRef?: ElementRef<HTMLDivElement>;

  private langService = inject(LanguageService);
  protected classroomService = inject(ClassroomService);
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
      capacity: r.maxCapacity
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

  // Computed reservations mapped from classroomService cards
  reservations = computed<AdminReservation[]>(() => {
    return (this.classroomService.cards() || [])
      .filter(c => c && c.status !== 'available')
      .map(c => this.mapCardToReservation(c))
      .filter((r): r is AdminReservation => r !== null && !!r.startTime);
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
      const resDateISO = res.date === 'Today' ? todayISO : (res.date || todayISO);

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

  toggleActionMenu(id: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.activeActionMenuId.update(curr => curr === id ? null : id);
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
      const resDateISO = res.date === 'Today' ? todayISO : (res.date || todayISO);

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
    if (!card || !card.id) return null;
    const startTime24 = this.convert12hTo24h(card.startTime || '09:00 AM');
    const endTime24 = this.convert12hTo24h(card.endTime || '11:00 AM');

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
    this.closeDetailPanel();
    this.router.navigate(['/classroom/show-classroom'], {
      queryParams: { checkout: res.id }
    });
  }

  onEditReservation(res: AdminReservation): void {
    this.closeDetailPanel();
    this.openEditReservationModal(res);
  }

  // ============================================================
  // FULL CRUD & DUPLICATE & SPLIT MODALS (ITEMS 24 & 25)
  // ============================================================
  isReservationModalOpen = signal(false);
  modalMode = signal<'new' | 'edit' | 'duplicate'>('new');
  resId = signal('');
  resRoomName = signal('');
  resInstructor = signal('');
  resActivity = signal('');
  resDate = signal('');
  resStartTime = signal('09:00 AM');
  resEndTime = signal('11:00 AM');
  resHourlyRate = signal(40);

  // Split Modal
  isSplitModalOpen = signal(false);
  splitTarget = signal<AdminReservation | null>(null);
  cutStartTime = signal('12:00 PM');
  cutEndTime = signal('01:00 PM');

  openNewReservationModal(): void {
    this.modalMode.set('new');
    this.resId.set('');
    this.resRoomName.set(this.rooms()[0]?.name || 'Nook Hall');
    this.resInstructor.set('');
    this.resActivity.set('');
    this.resDate.set(this.classroomService.getTodayDateISO());
    this.resStartTime.set('09:00 AM');
    this.resEndTime.set('11:00 AM');
    this.resHourlyRate.set(40);
    this.isReservationModalOpen.set(true);
  }

  openEditReservationModal(res: AdminReservation): void {
    this.modalMode.set('edit');
    this.resId.set(res.id);
    this.resRoomName.set(res.classroom);
    this.resInstructor.set(res.instructor);
    this.resActivity.set(res.activity);
    this.resDate.set(res.date === 'Today' ? this.classroomService.getTodayDateISO() : res.date);
    this.resStartTime.set(res.startTime);
    this.resEndTime.set(res.endTime);
    this.resHourlyRate.set(40);
    this.isReservationModalOpen.set(true);
  }

  duplicateReservation(res: AdminReservation): void {
    this.modalMode.set('duplicate');
    this.resId.set('');
    this.resRoomName.set(res.classroom);
    this.resInstructor.set(res.instructor);
    this.resActivity.set(res.activity + this.t().copySuffix);
    this.resDate.set(this.classroomService.getTodayDateISO());
    this.resStartTime.set(res.startTime);
    this.resEndTime.set(res.endTime);
    this.resHourlyRate.set(40);
    this.isReservationModalOpen.set(true);
  }

  saveReservation(): void {
    const instructor = this.resInstructor().trim();
    const activity = this.resActivity().trim();
    if (!instructor || !activity) return;

    const startMins = this.classroomService.parseTimeToMinutes(this.resStartTime());
    const endMins = this.classroomService.parseTimeToMinutes(this.resEndTime());
    const durHours = endMins > startMins ? +((endMins - startMins) / 60).toFixed(1) : 2;
    const isOngoing = this.classroomService.isSessionActive(this.resStartTime(), this.resEndTime(), this.resDate());

    if (this.modalMode() === 'edit' && this.resId()) {
      const existing = this.classroomService.getCardById(this.resId());
      if (existing) {
        this.classroomService.updateCard({
          ...existing,
          name: this.resRoomName(),
          instructor,
          activity,
          bookingDate: this.resDate(),
          startTime: this.resStartTime(),
          endTime: this.resEndTime(),
          durationHours: durHours,
          hourlyRate: this.resHourlyRate(),
          rental: +(durHours * this.resHourlyRate()).toFixed(2),
          status: isOngoing ? 'active' : 'scheduled'
        });
      }
    } else {
      // New or Duplicate
      const newCard: ClassroomCard = {
        id: 'res-' + Date.now(),
        name: this.resRoomName(),
        instructor,
        activity,
        bookingDate: this.resDate(),
        startTime: this.resStartTime(),
        endTime: this.resEndTime(),
        durationHours: durHours,
        hourlyRate: this.resHourlyRate(),
        rental: +(durHours * this.resHourlyRate()).toFixed(2),
        status: isOngoing ? 'active' : 'scheduled',
        image: '',
        colorTheme: 'blue',
        catering: 0,
        printingCharges: 0
      };
      this.classroomService.addBooking(newCard);
    }

    this.isReservationModalOpen.set(false);
  }

  deleteReservation(res: AdminReservation): void {
    const promptMsg = `${this.t().confirmDeleteBookingPrompt}\n("${res.activity}" - ${res.instructor})`;
    if (confirm(promptMsg)) {
      this.classroomService.deleteBooking(res.id);
    }
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
