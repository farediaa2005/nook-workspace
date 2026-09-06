import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of, catchError } from 'rxjs';
import {
  ClassroomCard,
  SelectableRoom,
  CateringProductItem,
  ClassroomCoupon,
  ClassroomOvertimeResult,
  ClassroomCheckoutPayload
} from '../models/classroom.model';
import { SettingsService } from './settings.service';
import { ClassroomApiService } from './api/classroom-api.service';
import { BookingApiService } from './api/booking-api.service';
import { ShiftService } from './shift.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ClassroomService {
  public static readonly STORAGE_KEY = 'nook_classroom_cards_cache';
  private settingsService = inject(SettingsService);
  private classroomApi = inject(ClassroomApiService);
  private bookingApi = inject(BookingApiService);
  private shiftService = inject(ShiftService);
  private authService = inject(AuthService);

  // Cards State: Pure live API & user-created data (with offline localStorage persistence)
  private cardsState = signal<ClassroomCard[]>(this.loadInitialCards());

  private canteenProductsState = signal<CateringProductItem[]>([]);

  private activeCheckoutCardState = signal<ClassroomCard | null>(null);

  /** Public Readonly Signals */
  readonly cards = this.cardsState;

  /** Dynamically linked rooms from SettingsService (Active only) */
  readonly rooms = computed<SelectableRoom[]>(() => {
    const settingsRooms = this.settingsService.rooms();
    let activeRooms = settingsRooms.filter(r => r.isActive && r.type === 'Classroom');
    if (activeRooms.length === 0) {
      activeRooms = settingsRooms.filter(r => r.isActive);
    }
    const themes = ['brown', 'blue', 'purple', 'emerald', 'orange', 'rose'] as const;
    return activeRooms.map((r, idx) => ({
      id: r.id,
      name: r.name,
      nameAr: r.name,
      nameEn: r.nameEn || r.name,
      type: r.type,
      maxCapacity: r.capacity,
      capacity: r.capacity,
      hourlyRate: r.hourlyPrice,
      image: r.imageUrl || '/images/rooms/room-workshop.jpg',
      imageUrl: r.imageUrl || '/images/rooms/room-workshop.jpg',
      colorTheme: themes[idx % themes.length],
      accentColor: '#f5b921'
    }));
  });

  readonly canteenProducts = this.canteenProductsState;
  readonly activeCheckoutCard = this.activeCheckoutCardState.asReadonly();

  /** Active and booked counts */
  readonly totalRooms = computed(() => this.cardsState().length);
  readonly activeRoomsCount = computed(() => this.cardsState().filter(c => c.status === 'active').length);
  readonly availableRoomsCount = computed(() => this.cardsState().filter(c => c.status === 'available').length);

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.syncWithBackend();
    }
  }

  private loadInitialCards(): ClassroomCard[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = localStorage.getItem(ClassroomService.STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {}
    return [];
  }

  /** Sync classroom cards with live backend */
  public syncWithBackend(): void {
    if (!this.authService.isAuthenticated()) return;
    this.classroomApi.getClassrooms().pipe(
      catchError((err) => {
        if (err?.status === 403) {
          console.info('[ClassroomService] Classroom API access restricted (403 Forbidden). Retaining cached sessions.');
        } else if (err?.status === 400) {
          console.info('[ClassroomService] Classroom API query rejected (400 Bad Request). Retaining cached sessions.');
        } else {
          console.warn('[ClassroomService] Could not sync classrooms from API:', err?.message || err);
        }
        return of(null);
      })
    ).subscribe({
      next: (classrooms) => {
        if (classrooms === null) {
          // Keep cached sessions on error
          return;
        }
        if (classrooms && classrooms.length > 0) {
          const themes = ['brown', 'blue', 'purple', 'emerald', 'orange', 'rose'] as const;
          const mappedCards: ClassroomCard[] = classrooms.map((c: any, idx) => {
            const isActive = c.status === 1 || c.status === 'Active' || c.status === 'active';
            const isScheduled = c.status === 2 || c.status === 'Scheduled' || c.status === 'scheduled';
            const roomMatch = this.rooms().find(r => r.id === c.roomId || (c.roomName && r.name.toLowerCase() === c.roomName.toLowerCase()));
            const timeFromStr = c.timeFrom ? (c.timeFrom.includes('T') ? c.timeFrom.split('T')[1].substring(0, 5) : c.timeFrom) : (c.startTime || '-');
            const timeToStr = c.timeTo ? (c.timeTo.includes('T') ? c.timeTo.split('T')[1].substring(0, 5) : c.timeTo) : (c.endTime || '-');

            return {
              id: c.id,
              roomId: c.roomId || roomMatch?.id,
              name: c.roomName || roomMatch?.name || c.name || '-',
              activity: c.activity || c.note || '-',
              instructor: c.instructorName || c.instructor || '-',
              status: isActive ? 'active' : (isScheduled ? 'scheduled' : 'available'),
              image: roomMatch?.image || '/images/rooms/room-workshop.jpg',
              colorTheme: themes[idx % themes.length],
              accentColor: '#f5b921',
              hourlyRate: c.hourlyRate || roomMatch?.hourlyRate || 0,
              startTime: timeFromStr,
              endTime: timeToStr,
              bookingDate: c.date ? c.date.split('T')[0] : (c.bookingDate || '-'),
              durationHours: c.durationHours || 0,
              rental: c.reservationCost ?? c.rentalCost ?? 0,
              catering: c.cateringTotal || c.catering || 0,
              printingCharges: c.printing || c.printingCharges || 0
            };
          });

          // Merge local un-synced cards (e.g. client generated IDs starting with 'room-')
          const existing = this.cardsState();
          const localOnly = existing.filter(c => c.id.startsWith('room-') && !mappedCards.some(m => m.id === c.id));
          const merged = [...mappedCards, ...localOnly];

          this.cardsState.set(merged);
          this.persistCards(merged);
        }
      }
    });
  }

  private persistCards(cards: ClassroomCard[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(ClassroomService.STORAGE_KEY, JSON.stringify(cards));
      }
    } catch {}
  }

  /** Set active card for checkout */
  setActiveCheckoutCard(card: ClassroomCard | null): void {
    this.activeCheckoutCardState.set(card);
  }

  /** Find card by ID */
  getCardById(id: string): ClassroomCard | undefined {
    return this.cardsState().find(c => c.id === id);
  }

  /** Add a new classroom booking */
  addBooking(newCard: ClassroomCard): void {
    this.cardsState.update(cards => {
      const updated = [newCard, ...cards];
      this.persistCards(updated);
      return updated;
    });

    const roomMatch = this.rooms().find(r => r.id === newCard.roomId || r.id === newCard.id || r.name.toLowerCase() === newCard.name.toLowerCase());
    const realRoomId = roomMatch?.id || (newCard.roomId && !newCard.roomId.startsWith('room-') ? newCard.roomId : undefined);

    // Sync with backend API
    this.classroomApi.createClassroom({
      roomId: realRoomId,
      instructorName: newCard.instructor,
      activity: newCard.activity,
      bookingDate: newCard.bookingDate || this.getTodayDateISO(),
      startTime: newCard.startTime || '09:00 AM',
      endTime: newCard.endTime || '11:00 AM',
      hourlyRate: newCard.hourlyRate || 100,
      printingCharges: newCard.printingCharges,
      discountPercent: 0
    }).subscribe({
      next: (created) => {
        if (created && created.id) {
          this.cardsState.update(cards => {
            const next = cards.map(c => c.id === newCard.id ? { ...c, id: created.id, roomId: realRoomId || c.roomId } : c);
            this.persistCards(next);
            return next;
          });
        }
      },
      error: () => {}
    });
  }

  /** Update an existing classroom card */
  updateCard(card: ClassroomCard): void {
    this.cardsState.update(cards => {
      const updated = cards.map(c => (c.id === card.id ? { ...c, ...card } : c));
      this.persistCards(updated);
      return updated;
    });

    if (card.id && !card.id.startsWith('room-')) {
      this.classroomApi.updateClassroom(card.id, {
        activity: card.activity,
        startTime: card.startTime,
        endTime: card.endTime
      }).subscribe({ error: () => {} });
    }
  }

  /** Add catering order to a classroom card */
  addCatering(cardId: string, amount: number, items?: any[]): void {
    this.cardsState.update(cards => {
      const updated = cards.map(c => {
        if (c.id === cardId) {
          const currentCatering = c.catering || 0;
          const newCatering = +(currentCatering + amount).toFixed(2);
          const existingItems = c.cateringItems || [];
          return {
            ...c,
            catering: newCatering,
            cateringItems: [...existingItems, ...(items || [])]
          };
        }
        return c;
      });
      this.persistCards(updated);
      return updated;
    });
  }

  /** Delete a booking */
  deleteBooking(cardId: string): void {
    this.cardsState.update(cards => {
      const updated = cards.filter(c => c.id !== cardId);
      this.persistCards(updated);
      return updated;
    });

    if (cardId && !cardId.startsWith('room-')) {
      this.classroomApi.deleteClassroom(cardId).subscribe({ error: () => {} });
    }
  }

  /** Split / Cut a reservation sub-range */
  splitReservation(cardId: string, cutStartStr: string, cutEndStr: string): boolean {
    const card = this.getCardById(cardId);
    if (!card || !card.startTime || !card.endTime) return false;

    const startMins = this.parseTimeToMinutes(card.startTime);
    const endMins = this.parseTimeToMinutes(card.endTime);
    const cutStartMins = this.parseTimeToMinutes(cutStartStr);
    const cutEndMins = this.parseTimeToMinutes(cutEndStr);

    if (cutStartMins >= cutEndMins || cutStartMins < startMins || cutEndMins > endMins) {
      return false;
    }

    const formatMins = (mins: number): string => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const period = h >= 12 ? 'PM' : 'AM';
      let h12 = h % 12;
      if (h12 === 0) h12 = 12;
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
    };

    // Remove original booking
    this.deleteBooking(cardId);

    // Segment 1 (before cut)
    if (cutStartMins > startMins) {
      const dur1 = +((cutStartMins - startMins) / 60).toFixed(1);
      const part1: ClassroomCard = {
        ...card,
        id: 'room-' + Date.now() + '-1',
        startTime: card.startTime,
        endTime: formatMins(cutStartMins),
        durationHours: dur1,
        rental: +(dur1 * (card.hourlyRate || 40)).toFixed(2)
      };
      this.addBooking(part1);
    }

    // Segment 2 (after cut)
    if (cutEndMins < endMins) {
      const dur2 = +((endMins - cutEndMins) / 60).toFixed(1);
      const part2: ClassroomCard = {
        ...card,
        id: 'room-' + (Date.now() + 100) + '-2',
        startTime: formatMins(cutEndMins),
        endTime: card.endTime,
        durationHours: dur2,
        rental: +(dur2 * (card.hourlyRate || 40)).toFixed(2)
      };
      this.addBooking(part2);
    }

    return true;
  }

  /** Checkout room session and reset card to available */
  checkoutRoom(cardId: string, checkoutData?: Partial<ClassroomCheckoutPayload>): void {
    const card = this.getCardById(cardId);

    this.cardsState.update(cards => {
      const updated = cards.map(c =>
        c.id === cardId
          ? {
              ...c,
              status: 'available' as const,
              activity: '',
              instructor: '',
              startTime: '',
              endTime: '',
              bookingDate: '',
              durationHours: 0,
              elapsed: '',
              rental: 0,
              catering: undefined,
              printingCharges: 0,
              timeAlertStatus: 'normal' as const,
              timeAlertMessage: '',
              overdueMinutes: 0
            }
          : c
      );
      this.persistCards(updated);
      return updated;
    });

    if (this.activeCheckoutCardState()?.id === cardId) {
      this.activeCheckoutCardState.set(null);
    }

    if (card) {
      const finalAmt = checkoutData?.finalAmount || card.rental || 100;
      this.shiftService.recordTransaction({
        type: 'classroom',
        paymentMethod: 'cash',
        amount: finalAmt,
        details: `إنهاء حجز قاعة - ${card.name} (${card.instructor || card.activity || 'حجز'})`
      });

      this.classroomApi.checkoutClassroom(cardId, {
        paymentMethod: 'Cash',
        roomRate: card.hourlyRate || 100,
        durationHours: card.durationHours || 1,
        finalAmount: finalAmt
      }).subscribe({ error: () => {} });
    }
  }

  /** Add printing charges to a card */
  addPrinting(cardId: string, amount: number = 10): void {
    this.cardsState.update(cards => {
      const updated = cards.map(c =>
        c.id === cardId
          ? { ...c, printingCharges: (c.printingCharges || 0) + amount }
          : c
      );
      return updated;
    });
  }

  /** Time calculation: convert "HH:MM AM/PM" to minutes from start of day */
  parseTimeToMinutes(timeStr?: string): number {
    if (!timeStr) return 0;
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + mins;
  }

  /** Check if a session time slot is active at current time */
  isSessionActive(startTimeStr?: string, endTimeStr?: string, bookingDateStr?: string): boolean {
    if (!startTimeStr) return false;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMins = this.parseTimeToMinutes(startTimeStr);
    const endMins = endTimeStr ? this.parseTimeToMinutes(endTimeStr) : startMins + 60;

    if (endMins < startMins) {
      const todayISO = this.getTodayDateISO();
      if (bookingDateStr) {
        if (bookingDateStr === todayISO) {
          return nowMinutes >= startMins;
        }
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayISO = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        if (bookingDateStr === yesterdayISO) {
          return nowMinutes <= endMins;
        }
        return false;
      }
      return nowMinutes >= startMins || nowMinutes <= endMins;
    } else {
      if (bookingDateStr) {
        const todayISO = this.getTodayDateISO();
        if (bookingDateStr !== todayISO) {
          return false;
        }
      }
      return nowMinutes >= startMins && nowMinutes <= endMins;
    }
  }

  /** Calculate overtime, 10-minute grace period, and status alerts */
  calculateOvertimeAndAlerts(
    card: ClassroomCard,
    isArabic: boolean
  ): ClassroomOvertimeResult {
    if (!card || !card.startTime || !card.endTime || card.status === 'available' || card.status === 'completed') {
      return {
        overdueMinutes: 0,
        extraHours: 0,
        overtimeStatus: 'normal',
        alertStatus: 'normal',
        alertMessage: ''
      };
    }

    const now = new Date();
    const todayISO = this.getTodayDateISO();
    const isToday = !card.bookingDate || card.bookingDate === todayISO;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    if (!isToday) {
      return {
        overdueMinutes: 0,
        extraHours: 0,
        overtimeStatus: 'normal',
        alertStatus: 'normal',
        alertMessage: ''
      };
    }

    const startMins = this.parseTimeToMinutes(card.startTime);
    const endMins = this.parseTimeToMinutes(card.endTime);

    if (nowMinutes < startMins) {
      return {
        overdueMinutes: 0,
        extraHours: 0,
        overtimeStatus: 'normal',
        alertStatus: 'normal',
        alertMessage: ''
      };
    }

    if (nowMinutes <= endMins) {
      const remainingMinutes = endMins - nowMinutes;
      if (remainingMinutes <= 15) {
        return {
          overdueMinutes: 0,
          extraHours: 0,
          overtimeStatus: 'normal',
          alertStatus: 'ending_soon',
          alertMessage: isArabic
            ? `فاضل ${remainingMinutes} دقيقة والحجز هيخلص`
            : `${remainingMinutes}m remaining until reservation ends`
        };
      }
      return {
        overdueMinutes: 0,
        extraHours: 0,
        overtimeStatus: 'normal',
        alertStatus: 'normal',
        alertMessage: ''
      };
    }

    const overdueMinutes = nowMinutes - endMins;

    if (overdueMinutes <= 10) {
      return {
        overdueMinutes,
        extraHours: 0,
        overtimeStatus: 'grace_period',
        alertStatus: 'ended_grace',
        alertMessage: isArabic
          ? `الوقت خلص خلاص (فترة سماح: ${10 - overdueMinutes} دقيقة متبقية)`
          : `Time ended (Grace period: ${10 - overdueMinutes}m remaining)`
      };
    }

    const extraHours = Math.ceil((overdueMinutes - 10) / 60);
    return {
      overdueMinutes,
      extraHours,
      overtimeStatus: 'extra_hour',
      alertStatus: 'overtime_charged',
      alertMessage: isArabic
        ? `الوقت عدى بـ ${overdueMinutes} دقيقة (+${extraHours} ساعة زيادة)`
        : `Overtime by ${overdueMinutes}m (+${extraHours}h extra charged)`
    };
  }

  /** Format elapsed time into human string e.g. "1h 15m" */
  calculateElapsed(startTimeStr?: string, bookingDateStr?: string): string {
    if (!startTimeStr) return '0h 00m';
    const now = new Date();
    const todayISO = this.getTodayDateISO();
    let nowMinutes = now.getHours() * 60 + now.getMinutes();

    if (bookingDateStr && bookingDateStr !== todayISO) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayISO = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      if (bookingDateStr === yesterdayISO) {
        nowMinutes += 24 * 60;
      }
    }

    const startMins = this.parseTimeToMinutes(startTimeStr);
    const diff = Math.max(0, nowMinutes - startMins);
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
  }

  /** Refresh cards status (alias for tickSessionTimers) */
  refreshCardsStatus(isArabic: boolean = false): void {
    this.tickSessionTimers(isArabic);
  }

  /** Periodically check sessions status and overtime */
  tickSessionTimers(isArabic: boolean = false): void {
    const now = new Date();
    const todayISO = this.getTodayDateISO();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    this.cardsState.update(cards =>
      (cards || []).map(card => {
        if (!card || !card.startTime || card.status === 'available' || card.status === 'completed') {
          return card;
        }

        const isToday = !card.bookingDate || card.bookingDate === todayISO;
        const startMins = this.parseTimeToMinutes(card.startTime);
        const isOngoing = this.isSessionActive(card.startTime, card.endTime, card.bookingDate);
        const newStatus = (isOngoing || (isToday && nowMinutes >= startMins)) ? 'active' : 'scheduled';

        const overtimeInfo = this.calculateOvertimeAndAlerts(card, isArabic);

        let newElapsed = card.elapsed;
        if (isOngoing || (isToday && nowMinutes >= startMins)) {
          newElapsed = this.calculateElapsed(card.startTime, card.bookingDate);
        }

        return {
          ...card,
          status: newStatus,
          elapsed: newElapsed,
          timeAlertStatus: overtimeInfo.alertStatus,
          timeAlertMessage: overtimeInfo.alertMessage,
          overdueMinutes: overtimeInfo.overdueMinutes
        };
      })
    );
  }

  /** Validate promo coupon codes */
  validateCoupon(code: string): ClassroomCoupon | null {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return null;

    if (['NOOK10', 'SAVE10', 'STUDENT10', '10%'].includes(cleanCode)) {
      return { code: cleanCode, discountPercent: 10, discountName: '10% OFF' };
    }
    if (['NOOK15', 'STUDENT15', '15%'].includes(cleanCode)) {
      return { code: cleanCode, discountPercent: 15, discountName: '15% OFF' };
    }
    if (['NOOK20', 'VIP20', '20%'].includes(cleanCode)) {
      return { code: cleanCode, discountPercent: 20, discountName: '20% OFF' };
    }
    if (['NOOK25', 'WELCOME25', '25%'].includes(cleanCode)) {
      return { code: cleanCode, discountPercent: 25, discountName: '25% OFF' };
    }
    if (['NOOK50', 'VIP50', '50%'].includes(cleanCode)) {
      return { code: cleanCode, discountPercent: 50, discountName: '50% OFF' };
    }

    const match = cleanCode.match(/(\d{1,2})$/);
    if (match) {
      const percent = Math.min(90, Math.max(5, parseInt(match[1], 10)));
      return { code: cleanCode, discountPercent: percent, discountName: `${percent}% OFF` };
    }

    return null;
  }

  /** API-ready 1-to-1 Swappable Methods */
  getClassrooms(): Observable<SelectableRoom[]> {
    return of(this.rooms());
  }

  getReservations(): Observable<ClassroomCard[]> {
    return of(this.cardsState());
  }

  createReservation(newCard: ClassroomCard): Observable<ClassroomCard> {
    this.addBooking(newCard);
    return of(newCard);
  }

  cancelReservation(cardId: string): Observable<boolean> {
    this.cardsState.update(cards => {
      const updated = cards.map(c => (c.id === cardId ? { ...c, status: 'cancelled' as const } : c));
      return updated;
    });
    return of(true);
  }

  /** Today ISO string helper */
  getTodayDateISO(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

}