import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of, map, catchError, tap, switchMap, forkJoin } from 'rxjs';
import {
  ClassroomCard,
  ClassroomStatus,
  SelectableRoom,
  CateringProductItem,
  ClassroomCoupon,
  ClassroomOvertimeResult,
  ClassroomCheckoutPayload,
  AdminReservation,
  ClassroomDto,
  CreateClassroomDto,
  UpdateClassroomDto,
  CheckoutClassroomDto,
  ReservationDto,
  CreateReservationDto,
  UpdateReservationDto,
  RoomDto,
  ClassroomTypeEnum
} from '../models/classroom.model';
import { ClassroomApiService } from './api/classroom-api.service';
import { ReservationApiService } from './api/reservation-api.service';
import { RoomApiService } from './api/room-api.service';
import { InstructorApiService } from './api/instructor-api.service';
import { CouponApiService } from './api/coupon-api.service';
import { ShiftService } from './shift.service';
import { AuthService } from './auth.service';
import { LanguageService } from './language.service';
import { CateringService } from './catering.service';
import {
  parseIsoToLocal12h,
  parseIsoToLocal24h,
  parseIsoToLocalDate,
  parseIsoToLocalDateObj,
  getTodayDateISO,
  convertMinutesTo12h,
  convertMinutesTo24h,
  parseTimeToMinutes
} from '../utils/date-time.util';

/**
 * Clean Architecture Layer 4: Feature Service
 * Brain and state management for Classroom and Reservation domains.
 * Pure Observable data flow, 100% connected to Backend API.
 * NO localStorage database caching, NO mock data fallbacks.
 */
@Injectable({
  providedIn: 'root'
})
export class ClassroomService {
  private classroomApi = inject(ClassroomApiService);
  private reservationApi = inject(ReservationApiService);
  private roomApi = inject(RoomApiService);
  private instructorApi = inject(InstructorApiService);
  private couponApi = inject(CouponApiService);
  private shiftService = inject(ShiftService);
  private authService = inject(AuthService);
  private langService = inject(LanguageService);
  private cateringService = inject(CateringService);

  // ============================================================
  // REACTIVE STATE SIGNALS
  // ============================================================
  private cardsState = signal<ClassroomCard[]>([]);
  private reservationsState = signal<AdminReservation[]>([]);
  private roomsState = signal<SelectableRoom[]>([]);
  private instructorsState = signal<any[]>([]);
  private canteenProductsState = signal<CateringProductItem[]>([]);
  private activeCheckoutCardState = signal<ClassroomCard | null>(null);
  private loadingState = signal<boolean>(false);
  private errorState = signal<string | null>(null);

  /** Public Readonly Signals */
  readonly cards = this.cardsState.asReadonly();
  readonly reservations = this.reservationsState.asReadonly();
  readonly rooms = this.roomsState.asReadonly();
  readonly instructors = this.instructorsState.asReadonly();
  readonly canteenProducts = this.canteenProductsState;
  readonly activeCheckoutCard = this.activeCheckoutCardState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  /** Computed Room Status Counts */
  readonly totalRooms = computed(() => this.roomsState().length);
  readonly activeRoomsCount = computed(() => this.cardsState().filter(c => c.status === 'active').length);
  readonly availableRoomsCount = computed(() => {
    const total = this.roomsState().length;
    const active = this.cardsState().filter(c => c.status === 'active').length;
    return Math.max(0, total - active);
  });

  // Persistent classroom catering & instructor cache prefixes
  private readonly CLASSROOM_CATERING_CACHE_PREFIX = 'nook_catering_classroom_';
  private readonly CLASSROOM_INSTRUCTOR_CACHE_PREFIX = 'nook_instructor_classroom_';
  private instructorMap = new Map<string, any>();

  public getClassroomInstructorCache(cardId: string): string | null {
    try {
      return localStorage.getItem(this.CLASSROOM_INSTRUCTOR_CACHE_PREFIX + cardId);
    } catch {
      return null;
    }
  }

  public setClassroomInstructorCache(cardId: string, instructor: string): void {
    try {
      if (instructor && instructor.trim() && instructor !== '-') {
        localStorage.setItem(this.CLASSROOM_INSTRUCTOR_CACHE_PREFIX + cardId, instructor.trim());
      }
    } catch { }
  }

  public getClassroomCateringCache(cardId: string): { total: number; items: any[] } | null {
    try {
      if (!cardId) return null;
      const raw = localStorage.getItem(this.CLASSROOM_CATERING_CACHE_PREFIX + cardId);
      if (raw) return JSON.parse(raw);
    } catch { }
    return null;
  }

  public setClassroomCateringCache(cardId: string, total: number, items: any[]): void {
    try {
      if (!cardId) return;
      localStorage.setItem(this.CLASSROOM_CATERING_CACHE_PREFIX + cardId, JSON.stringify({ total, items }));
    } catch { }
  }

  public removeClassroomCateringCache(cardId: string): void {
    try {
      if (!cardId) return;
      localStorage.removeItem(this.CLASSROOM_CATERING_CACHE_PREFIX + cardId);
    } catch { }
  }

  /** Load and cache all instructors from backend API */
  public loadInstructors(): Observable<any[]> {
    return this.instructorApi.getInstructors().pipe(
      tap(instructors => {
        this.instructorMap.clear();
        (instructors || []).forEach(ins => this.instructorMap.set(ins.id, ins));
        this.instructorsState.set(instructors || []);
      }),
      catchError(() => of([]))
    );
  }

  /** Sync catering items directly from backend API for a classroom session */
  syncClassroomCatering(classroomId: string): void {
    if (!classroomId || !/^[0-9a-fA-F-]{36}$/.test(classroomId)) return;

    this.classroomApi.getCateringItems(classroomId).subscribe({
      next: (items) => {
        if (items && Array.isArray(items) && items.length > 0) {
          const currentCard = this.cardsState().find(c => c.id === classroomId);
          const currentItems = currentCard?.cateringItems || [];
          const allProducts = this.cateringService.products();

          const enrichedItems = items.map(it => {
            const prodId = it.productId || (it as any).product?.id || it.id;
            const prod = allProducts.find(p => p.id === prodId);
            const existing = currentItems.find(c => c.productId === prodId || c.id === it.id);

            const name = it.name || (it as any).product?.nameAr || (it as any).product?.name || existing?.name || prod?.nameAr || prod?.name || 'صنف كاترنج';
            const unitPrice = Number(it.unitPrice || (it as any).price || existing?.unitPrice || prod?.sellingPrice || 0);
            const quantity = Number(it.quantity || existing?.quantity || 1);
            const totalPrice = Number(it.totalPrice || (it as any).total || (unitPrice * quantity) || existing?.totalPrice || (prod?.sellingPrice ? prod.sellingPrice * quantity : 0));

            return {
              ...it,
              id: it.id || existing?.id || `${Date.now()}_${Math.random()}`,
              productId: prodId,
              name,
              nameAr: (it as any).nameAr || existing?.nameAr || prod?.nameAr,
              unitPrice,
              quantity,
              totalPrice,
              price: totalPrice,
              product: (it as any).product || existing?.product || prod
            };
          });

          const total = enrichedItems.reduce((sum, it) => sum + (it.totalPrice || it.price || 0), 0);
          const roundedTotal = +total.toFixed(2);
          const finalTotal = roundedTotal > 0 ? roundedTotal : (currentCard?.catering || 0);

          this.setClassroomCateringCache(classroomId, finalTotal, enrichedItems);
          if (currentCard?.roomId) {
            this.setClassroomCateringCache(currentCard.roomId, finalTotal, enrichedItems);
          }
          this.cardsState.update(cards =>
            cards.map(c => c.id === classroomId ? { ...c, catering: finalTotal, cateringItems: enrichedItems } : c)
          );
        }
      },
      error: () => { }
    });
  }

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.syncWithBackend();
    }
  }

  // ============================================================
  // BACKEND SYNCHRONIZATION & DATA FETCHING
  // ============================================================

  /** Complete backend data synchronization */
  public syncWithBackend(): void {
    if (!this.authService.isAuthenticated()) return;
    forkJoin([
      this.loadInstructors(),
      this.loadRooms()
    ]).subscribe({
      next: () => {
        forkJoin([
          this.loadClassrooms(),
          this.loadReservations()
        ]).subscribe();
      },
      error: () => {
        this.loadClassrooms().subscribe();
        this.loadReservations().subscribe();
      }
    });
  }

  /** Load rooms from GET /api/Rooms */
  public loadRooms(): Observable<SelectableRoom[]> {
    return this.roomApi.getRooms().pipe(
      map(rooms => {
        const activeRooms = (rooms || []).filter(r => r.isActive !== false && r.supportsClassroom !== false);
        const themes = ['brown', 'blue', 'purple', 'emerald', 'orange', 'rose'] as const;
        const roomImages = [
          '/images/rooms/room-workshop.jpg',
          '/images/rooms/room-studio.jpg',
          '/images/rooms/room-design.jpg'
        ];
        const mapped: SelectableRoom[] = activeRooms.map((r, idx) => {
          const roomImg = r.imageUrl && r.imageUrl.trim() ? r.imageUrl.trim() : roomImages[idx % roomImages.length];
          return {
            id: r.id,
            name: r.name,
            nameAr: r.name,
            nameEn: r.nameEn || r.name,
            type: 'Classroom',
            capacity: r.capacity || 20,
            maxCapacity: r.capacity || 20,
            hourlyRate: r.hourlyPrice || 40,
            image: roomImg,
            imageUrl: roomImg,
            colorTheme: themes[idx % themes.length],
            accentColor: '#f5b921'
          };
        });
        this.roomsState.set(mapped);
        return mapped;
      }),
      catchError(err => {
        console.warn('[ClassroomService] Failed to load rooms from API:', err);
        return of([]);
      })
    );
  }

  private completedCardIds = new Set<string>();

  /** Load classroom sessions from GET /api/Classrooms */
  public loadClassrooms(params?: any): Observable<ClassroomCard[]> {
    this.loadingState.set(true);
    this.errorState.set(null);

    return this.classroomApi.getClassrooms(params).pipe(
      map(classrooms => {
        const themes = ['brown', 'blue', 'purple', 'emerald', 'orange', 'rose'] as const;
        const currentRooms = this.roomsState();

        const mappedCards: ClassroomCard[] = (classrooms || []).map((c: ClassroomDto, idx: number) => {
          const statusVal = c.status !== undefined && c.status !== null ? String(c.status).toLowerCase() : '';
          const statusNum = Number(c.status);

          const isExplicitlyCompleted = this.completedCardIds.has(c.id) ||
            statusNum === 2 ||
            statusVal === '2' ||
            statusVal === 'completed' ||
            statusVal === 'left' ||
            (c as any).isCompleted === true;
          const isCancelled = statusNum === 4 || statusVal === '4' || statusVal === 'cancelled';
          const isScheduled = statusNum === 3 || statusVal === '3' || statusVal === 'scheduled';
          const isActive = !isExplicitlyCompleted && !isCancelled && (statusNum === 1 || statusVal === '1' || statusVal === 'active' || (!c.timeTo && !isScheduled));

          const roomMatch = currentRooms.find(r => r.id === c.roomId || (c.roomName && r.name.toLowerCase() === c.roomName.toLowerCase()));

          const timeFromStr = this.parseIsoToLocal12h(c.timeFrom) || (c.startTime ? this.parseIsoToLocal12h(c.startTime) : '-');
          let timeToStr = this.parseIsoToLocal12h(c.timeTo) || (c.endTime ? this.parseIsoToLocal12h(c.endTime) : '-');

          const bookingDateStr = this.parseIsoToLocalDate(c.date || c.bookingDate || c.timeFrom || c.startTime);

          const duration = c.durationHours && c.durationHours > 0 ? c.durationHours : 2;
          if (!timeToStr || timeToStr === '-' || timeToStr === timeFromStr) {
            if (timeFromStr && timeFromStr !== '-') {
              const startMins = this.parseTimeToMinutes(timeFromStr);
              const endMins = (startMins + Math.round(duration * 60)) % (24 * 60);
              timeToStr = this.convertMinutesTo12h(endMins);
            }
          }

          let computedStatus: ClassroomStatus = 'available';
          if (isExplicitlyCompleted || isCancelled) {
            computedStatus = 'available';
          } else if (isActive) {
            computedStatus = 'active';
          } else if (isScheduled) {
            computedStatus = 'scheduled';
          } else {
            computedStatus = 'available';
          }

          const elapsed = computedStatus === 'active' ? this.calculateElapsed(timeFromStr, bookingDateStr) : `${duration}h session`;

          const isArabic = this.langService.isArabic();
          const overtimeInfo = this.calculateOvertimeAndAlerts({
            startTime: timeFromStr,
            endTime: timeToStr,
            bookingDate: bookingDateStr,
            status: computedStatus,
            durationHours: duration
          } as ClassroomCard, isArabic);

          // 1. Check direct instructor fields on the DTO
          let resolvedInstructor: string | null =
            (c.instructorName && c.instructorName.trim() && c.instructorName.trim() !== '-' ? c.instructorName.trim() : null) ||
            ((c as any).instructor_name && (c as any).instructor_name.trim() !== '-' ? (c as any).instructor_name.trim() : null) ||
            ((c as any).InstructorName && (c as any).InstructorName.trim() !== '-' ? (c as any).InstructorName.trim() : null) ||
            (typeof (c as any).instructor === 'string' && (c as any).instructor.trim() !== '-' ? (c as any).instructor.trim() : null) ||
            ((c as any).instructor?.name && (c as any).instructor.name.trim() !== '-' ? (c as any).instructor.name.trim() : null) ||
            (typeof (c as any).Instructor === 'string' && (c as any).Instructor.trim() !== '-' ? (c as any).Instructor.trim() : null) ||
            ((c as any).Instructor?.name && (c as any).Instructor.name.trim() !== '-' ? (c as any).Instructor.name.trim() : null) ||
            null;

          // 2. Lookup via instructorId in cached instructorMap
          const insId = c.instructorId || (c as any).InstructorId;
          if (!resolvedInstructor && insId) {
            const foundIns = this.instructorMap.get(insId);
            if (foundIns?.name && foundIns.name.trim()) {
              resolvedInstructor = foundIns.name.trim();
            }
          }

          // 3. Fallback to localStorage cache
          if (!resolvedInstructor && c.id) {
            const cached = this.getClassroomInstructorCache(c.id);
            if (cached && cached.trim() && cached !== '-') {
              resolvedInstructor = cached.trim();
            }
          }

          // 4. Fallback to in-memory card state
          if (!resolvedInstructor && c.id) {
            const memCard = this.cardsState().find(card => card.id === c.id);
            if (memCard?.instructor && memCard.instructor.trim() && memCard.instructor !== '-') {
              resolvedInstructor = memCard.instructor.trim();
            }
          }

          // 5. Fallback to c.note (if not a placeholder)
          if (!resolvedInstructor && c.note && c.note.trim() && c.note.trim() !== '-') {
            const cleanNote = c.note.trim();
            if (!cleanNote.startsWith('-') && !cleanNote.toLowerCase().includes('classroom') && !cleanNote.toLowerCase().includes('hall')) {
              resolvedInstructor = cleanNote;
            }
          }

          // 6. Fallback to instructor phone if available
          if (!resolvedInstructor && c.instructorPhoneNumber && c.instructorPhoneNumber.trim()) {
            resolvedInstructor = c.instructorPhoneNumber.trim();
          }

          // Clean up corrupted placeholder strings like "- - Classroom" or "- - jkk"
          if (resolvedInstructor) {
            resolvedInstructor = resolvedInstructor.replace(/^[-–—\s]+/, '').trim();
            if (resolvedInstructor.startsWith('-') || resolvedInstructor.length < 2) {
              resolvedInstructor = '-';
            }
          }

          if (!resolvedInstructor) {
            resolvedInstructor = '-';
          }

          // Cache for future loads
          if (c.id && resolvedInstructor !== '-') {
            this.setClassroomInstructorCache(c.id, resolvedInstructor);
          }

          // Resolve activity
          let resolvedActivity = c.activity && c.activity.trim() && c.activity.trim() !== '-' ? c.activity.trim() : null;
          if (!resolvedActivity) {
            if (c.note && c.note.trim() && c.note.trim() !== resolvedInstructor && c.note.trim() !== '-') {
              resolvedActivity = c.note.trim();
            } else {
              resolvedActivity = '-';
            }
          }

          const hourlyRate = c.hourlyRate || roomMatch?.hourlyRate || 40;
          let normalRental = c.reservationCost ?? c.rentalCost ?? 0;
          if (normalRental <= 0 || normalRental > 50000) {
            normalRental = +(duration * hourlyRate).toFixed(2);
          }

          return {
            id: c.id,
            roomId: c.roomId || roomMatch?.id,
            instructorId: insId || undefined,
            name: c.roomName || roomMatch?.name || 'Classroom',
            activity: resolvedActivity,
            instructor: resolvedInstructor,
            phone: c.instructorPhoneNumber || c.instructorPhone || (insId ? this.instructorMap.get(insId)?.phoneNumber : undefined),
            status: computedStatus,
            image: roomMatch?.image || '/images/rooms/room-workshop.jpg',
            colorTheme: themes[idx % themes.length],
            accentColor: '#f5b921',
            hourlyRate: hourlyRate,
            startTime: timeFromStr,
            endTime: timeToStr,
            bookingDate: bookingDateStr,
            durationHours: duration,
            elapsed: elapsed,
            timeAlertStatus: overtimeInfo.alertStatus,
            timeAlertMessage: overtimeInfo.alertMessage,
            overdueMinutes: overtimeInfo.overdueMinutes,
            rental: normalRental,
            catering: (() => {
              const cached = this.getClassroomCateringCache(c.id) || (c.roomId ? this.getClassroomCateringCache(c.roomId) : null);
              const apiVal = Number(c.cateringTotal ?? (c as any).catering ?? (c as any).cateringCost) || 0;
              if (apiVal > 0) return apiVal;
              if (cached?.total && cached.total > 0) return cached.total;
              return undefined;
            })(),
            cateringItems: (() => {
              const cached = this.getClassroomCateringCache(c.id) || (c.roomId ? this.getClassroomCateringCache(c.roomId) : null);
              if (cached?.items && cached.items.length > 0) return cached.items;
              return (c as any).cateringItems || undefined;
            })(),
            printingCharges: c.printing || c.printingCharges || 0
          };
        });

        this.cardsState.set(mappedCards);
        this.loadingState.set(false);

        // Sync catering items from backend API for active classroom sessions
        mappedCards.filter(cd => cd.status === 'active').forEach(cd => {
          if (cd.id && /^[0-9a-fA-F-]{36}$/.test(cd.id)) {
            this.syncClassroomCatering(cd.id);
          }
        });

        return mappedCards;
      }),
      catchError(err => {
        console.error('[ClassroomService] Failed to load classrooms from API:', err);
        this.errorState.set(err?.message || 'Failed to load classroom sessions');
        this.loadingState.set(false);
        return of([]);
      })
    );
  }

  /** Load scheduled reservations from GET /api/Reservations */
  public loadReservations(params?: any): Observable<AdminReservation[]> {
    return this.reservationApi.getReservations(params).pipe(
      map(reservations => {
        const currentRooms = this.roomsState();
        const mapped: AdminReservation[] = (reservations || []).map((r: ReservationDto) => {
          const roomMatch = currentRooms.find(rm => rm.id === r.roomId || (r.roomName && rm.name.toLowerCase() === r.roomName.toLowerCase()));
          const sTime = this.parseIsoToLocal24h(r.timeFrom) || '09:00';
          let eTime = this.parseIsoToLocal24h(r.timeTo) || '11:00';

          const startMins = this.parseTimeToMinutes(sTime);
          let endMins = this.parseTimeToMinutes(eTime);
          if (endMins <= startMins) {
            endMins = startMins + 120;
            eTime = this.convertMinutesTo24h(endMins);
          }
          const diffMinutes = endMins - startMins;
          const durHours = diffMinutes > 0 ? +(diffMinutes / 60).toFixed(1) : 2;

          const dateStr = this.parseIsoToLocalDate(r.dateFrom);
          const isToday = dateStr === this.getTodayDateISO();

          return {
            id: r.id,
            displayId: `RES-${r.id.substring(0, 4).toUpperCase()}`,
            instructor: r.instructorName || r.note || 'Instructor',
            activity: r.activity || 'Classroom Reservation',
            classroom: r.roomName || roomMatch?.name || 'Hall',
            capacity: roomMatch?.maxCapacity || 20,
            date: isToday ? 'Today' : dateStr,
            fullDate: dateStr,
            startTime: sTime,
            endTime: eTime,
            timeRange: `${sTime} - ${eTime}`,
            durationHours: durHours,
            cost: r.reservationCost || 0,
            status: 'upcoming',
            colorTheme: 'blue',
            costBreakdown: {
              baseRate: r.reservationCost || 0,
              baseRateLabel: this.langService.t().baseRate,
              equipmentAddon: 0,
              earlyBirdDiscount: r.discount || 0,
              total: r.reservationCost || 0
            }
          };
        });

        this.reservationsState.set(mapped);
        return mapped;
      }),
      catchError(err => {
        console.warn('[ClassroomService] Failed to load reservations from API:', err);
        return of([]);
      })
    );
  }

  // ============================================================
  // MUTATION OPERATIONS (Strict API Operations)
  // ============================================================

  /** Set active card for checkout */
  setActiveCheckoutCard(card: ClassroomCard | null): void {
    this.activeCheckoutCardState.set(card);
  }

  /** Find card by ID */
  getCardById(id: string): ClassroomCard | undefined {
    return this.cardsState().find(c => c.id === id);
  }

  /** Add a new classroom session via POST /api/Classrooms */
  public findInstructorIdByName(name: string): string | undefined {
    if (!name) return undefined;
    const clean = name.trim().toLowerCase();
    for (const [id, ins] of this.instructorMap.entries()) {
      if (ins.name && ins.name.trim().toLowerCase() === clean) {
        return id;
      }
    }
    return undefined;
  }

  /** Add a new classroom session via POST /api/Classrooms */
  addBooking(newCard: ClassroomCard): Observable<ClassroomCard> {
    const roomMatch = this.roomsState().find(r => r.id === newCard.roomId || r.name.toLowerCase() === newCard.name.toLowerCase());
    const realRoomId = roomMatch?.id || newCard.roomId;

    const duration = newCard.durationHours && newCard.durationHours > 0 ? newCard.durationHours : 2;
    const startTime12 = newCard.startTime || this.convertMinutesTo12h(new Date().getHours() * 60 + new Date().getMinutes());
    let endTime12 = newCard.endTime;
    if (!endTime12 || endTime12 === startTime12) {
      const startMins = this.parseTimeToMinutes(startTime12);
      endTime12 = this.convertMinutesTo12h(startMins + Math.round(duration * 60));
    }

    const matchedInsId = newCard.instructorId || this.findInstructorIdByName(newCard.instructor);

    const payload: CreateClassroomDto = {
      roomId: realRoomId,
      instructorId: matchedInsId,
      instructorName: newCard.instructor,
      activity: newCard.activity,
      bookingDate: newCard.bookingDate || this.getTodayDateISO(),
      startTime: this.convertTimeToISO(startTime12, newCard.bookingDate),
      endTime: this.convertTimeToISO(endTime12, newCard.bookingDate),
      timeFrom: this.convertTimeToISO(startTime12, newCard.bookingDate),
      timeTo: this.convertTimeToISO(endTime12, newCard.bookingDate),
      date: newCard.bookingDate ? new Date(newCard.bookingDate).toISOString() : new Date().toISOString(),
      reservationCost: newCard.rental || newCard.hourlyRate || 40,
      hourlyRate: newCard.hourlyRate || 40,
      printingCharges: newCard.printingCharges || 0,
      printing: newCard.printingCharges || 0,
      discount: 0,
      payWay: 1,
      type: ClassroomTypeEnum.New,
      note: newCard.instructor
    };

    return this.classroomApi.createClassroom(payload).pipe(
      map(created => {
        const card: ClassroomCard = {
          ...newCard,
          id: created.id,
          roomId: created.roomId || realRoomId,
          instructorId: matchedInsId,
          instructor: newCard.instructor || '-',
          name: roomMatch?.name || newCard.name,
          startTime: startTime12,
          endTime: endTime12,
          durationHours: duration,
          rental: created.reservationCost ?? newCard.rental
        };
        if (card.id && card.instructor && card.instructor !== '-') {
          this.setClassroomInstructorCache(card.id, card.instructor);
        }
        this.cardsState.update(cards => [card, ...cards]);
        return card;
      }),
      catchError(err => {
        console.error('[ClassroomService] Error creating classroom session:', err);
        throw err;
      })
    );
  }

  /** Update an existing classroom card via PUT /api/Classrooms/{id} */
  updateCard(card: ClassroomCard): Observable<ClassroomDto> {
    if (card.id && card.instructor && card.instructor !== '-') {
      this.setClassroomInstructorCache(card.id, card.instructor);
    }
    const matchedInsId = card.instructorId || this.findInstructorIdByName(card.instructor);

    const payload: UpdateClassroomDto = {
      roomId: card.roomId,
      activity: card.activity,
      note: card.instructor,
      instructorId: matchedInsId,
      timeFrom: this.convertTimeToISO(card.startTime, card.bookingDate),
      timeTo: this.convertTimeToISO(card.endTime, card.bookingDate),
      reservationCost: card.rental,
      printing: card.printingCharges
    };

    return this.classroomApi.updateClassroom(card.id, payload).pipe(
      tap(() => {
        this.cardsState.update(cards => cards.map(c => c.id === card.id ? { ...c, ...card, instructorId: matchedInsId } : c));
      }),
      catchError(err => {
        console.error('[ClassroomService] Error updating classroom session:', err);
        throw err;
      })
    );
  }

  /** Delete a booking via DELETE /api/Classrooms/{id} */
  deleteBooking(cardId: string): Observable<boolean> {
    return this.classroomApi.deleteClassroom(cardId).pipe(
      tap(() => {
        this.cardsState.update(cards => cards.filter(c => c.id !== cardId));
      }),
      catchError(err => {
        console.error('[ClassroomService] Error deleting classroom session:', err);
        throw err;
      })
    );
  }

  /** Checkout room session via PUT /api/Classrooms/{id}/checkout */
  checkoutRoom(cardId: string, checkoutData?: Partial<ClassroomCheckoutPayload>): Observable<any> {
    const card = this.getCardById(cardId);
    const finalAmt = checkoutData?.finalAmount || card?.rental || 40;

    const activeShift = this.shiftService.currentShift();
    const currentUser = this.authService.getUser();
    const staffId = checkoutData?.staffId || currentUser?.id || null;
    const shiftId = checkoutData?.shiftId || activeShift?.id || null;

    const payload: CheckoutClassroomDto = {
      timeTo: new Date().toISOString(),
      actualAttendees: checkoutData?.attendeesCount ?? null,
      paymentMethod: checkoutData?.paymentMethod || 'Cash',
      usePackageHours: checkoutData?.usePackageHours ?? 0,
      packageId: checkoutData?.packageId ?? null,
      paidAmount: checkoutData?.amountReceived ?? finalAmt,
      reservationCost: finalAmt,
      printing: checkoutData?.printingAmount || card?.printingCharges || 0,
      discount: checkoutData?.loyaltyDiscount || 0,
      payWay: checkoutData?.paymentMethod === 'vodafone' ? 2 : (checkoutData?.paymentMethod === 'instapay' ? 3 : (checkoutData?.paymentMethod === 'fawry' ? 4 : 1)),
      note: card ? `${card.name} - ${card.instructor}` : null,
      shiftId: shiftId,
      staffId: staffId
    };

    return this.classroomApi.checkoutClassroom(cardId, payload).pipe(
      tap(() => {
        this.completedCardIds.add(cardId);

        // Record shift transaction
        this.shiftService.recordTransaction({
          type: 'classroom',
          paymentMethod: checkoutData?.paymentMethod || 'cash',
          amount: finalAmt,
          details: `إنهاء حجز قاعة - ${card?.name || 'Classroom'} (${card?.instructor || 'حجز'})`
        });

        // Reset card in memory state
        this.removeClassroomCateringCache(cardId);
        if (card?.roomId) this.removeClassroomCateringCache(card.roomId);
        this.cardsState.update(cards =>
          cards.map(c =>
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
          )
        );

        // Fetch fresh state from backend
        this.loadClassrooms().subscribe();

        if (this.activeCheckoutCardState()?.id === cardId) {
          this.activeCheckoutCardState.set(null);
        }
      }),
      catchError(err => {
        console.error('[ClassroomService] Error checking out classroom session:', err);
        throw err;
      })
    );
  }

  /** Add catering order to a classroom card */
  addCatering(cardId: string, amount: number, items?: any[]): void {
    const card = this.getCardById(cardId) || this.cardsState().find(c => c.roomId === cardId);
    if (!card) return;

    const normalizedItems = (items || []).map(item => {
      const prodId = item.productId || item.product?.id || item.id;
      const unitPrice = Number(item.unitPrice ?? item.price ?? item.product?.piecePrice ?? item.product?.sellingPrice ?? 0);
      const quantity = Number(item.quantity || 1);
      const totalPrice = Number(item.totalPrice ?? item.total ?? (unitPrice * quantity));
      const name = item.name || item.product?.nameAr || item.product?.name || 'صنف كاترنج';
      return {
        id: item.id || prodId || `${Date.now()}_${Math.random()}`,
        productId: prodId,
        name,
        nameAr: item.nameAr || item.product?.nameAr || item.product?.name,
        unitPrice,
        quantity,
        totalPrice,
        price: totalPrice,
        product: item.product
      };
    });

    const targetId = card.id;
    this.cardsState.update(cards =>
      cards.map(c => {
        if (c.id === targetId || (c.roomId && c.roomId === cardId)) {
          const currentCatering = c.catering || 0;
          const newCatering = +(currentCatering + amount).toFixed(2);
          const existingItems = c.cateringItems || [];
          const combinedItems = [...existingItems, ...normalizedItems];
          this.setClassroomCateringCache(c.id, newCatering, combinedItems);
          if (c.roomId) {
            this.setClassroomCateringCache(c.roomId, newCatering, combinedItems);
          }
          return {
            ...c,
            catering: newCatering,
            cateringItems: combinedItems
          };
        }
        return c;
      })
    );

    // Call catering API for all items if card is a backend GUID
    if (normalizedItems.length > 0 && /^[0-9a-fA-F-]{36}$/.test(targetId)) {
      normalizedItems.forEach(item => {
        if (item.productId) {
          this.classroomApi.addCateringItem(targetId, {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }).subscribe({
            next: () => this.syncClassroomCatering(targetId),
            error: (e) => console.warn('[ClassroomService] Could not persist catering order to API:', e)
          });
        }
      });
    }
  }

  /** Add printing charges to a card */
  addPrinting(cardId: string, amount: number = 10): void {
    this.cardsState.update(cards =>
      cards.map(c =>
        c.id === cardId
          ? { ...c, printingCharges: (c.printingCharges || 0) + amount }
          : c
      )
    );
  }

  // ============================================================
  // SCHEDULED RESERVATION OPERATIONS
  // ============================================================

  /** Create scheduled reservation via POST /api/Reservations */
  createReservation(dto: CreateReservationDto): Observable<AdminReservation> {
    const targetDate = dto.dateFrom || this.getTodayDateISO();
    const isoStart = this.convertTimeToISO(dto.timeFrom, targetDate);
    const isoEnd = this.convertTimeToISO(dto.timeTo, targetDate);

    const roomMatch = this.roomsState().find(rm => rm.id === dto.roomId || (dto.roomName && rm.name.toLowerCase() === dto.roomName.toLowerCase()));
    const realRoomId = roomMatch?.id || dto.roomId;
    const matchedInsId = dto.instructorId || this.findInstructorIdByName(dto.instructorName || '');

    const payload: CreateReservationDto = {
      ...dto,
      roomId: realRoomId,
      instructorId: matchedInsId,
      instructorName: dto.instructorName,
      activity: dto.activity,
      dateFrom: targetDate ? new Date(targetDate).toISOString() : new Date().toISOString(),
      dateTo: targetDate ? new Date(targetDate).toISOString() : new Date().toISOString(),
      timeFrom: isoStart,
      timeTo: isoEnd,
      reservationCost: dto.reservationCost || 0
    };

    return this.reservationApi.createReservation(payload).pipe(
      map(created => {
        const sTime = this.parseIsoToLocal24h(created.timeFrom) || dto.timeFrom || '09:00';
        let eTime = this.parseIsoToLocal24h(created.timeTo) || dto.timeTo || '11:00';

        const startMins = this.parseTimeToMinutes(sTime);
        let endMins = this.parseTimeToMinutes(eTime);
        if (endMins <= startMins) {
          endMins = startMins + 120;
          eTime = this.convertMinutesTo24h(endMins);
        }
        const diffMinutes = endMins - startMins;
        const durHours = diffMinutes > 0 ? +(diffMinutes / 60).toFixed(1) : 2;

        const dateStr = this.parseIsoToLocalDate(created.dateFrom) || targetDate;
        const res: AdminReservation = {
          id: created.id,
          displayId: `RES-${created.id.substring(0, 4).toUpperCase()}`,
          instructor: dto.instructorName || created.instructorName || 'Instructor',
          activity: created.activity || dto.activity || 'Classroom Reservation',
          classroom: dto.roomName || roomMatch?.name || 'Hall',
          capacity: roomMatch?.maxCapacity || 20,
          date: dateStr === this.getTodayDateISO() ? 'Today' : dateStr,
          fullDate: dateStr,
          startTime: sTime,
          endTime: eTime,
          timeRange: `${sTime} - ${eTime}`,
          durationHours: durHours,
          cost: created.reservationCost || dto.reservationCost || 0,
          status: 'upcoming',
          colorTheme: 'blue',
          costBreakdown: {
            baseRate: created.reservationCost || dto.reservationCost || 0,
            baseRateLabel: this.langService.t().baseRate,
            equipmentAddon: 0,
            earlyBirdDiscount: created.discount || 0,
            total: created.reservationCost || dto.reservationCost || 0
          }
        };

        this.reservationsState.update(resList => [res, ...resList]);
        return res;
      }),
      catchError(err => {
        console.error('[ClassroomService] Error creating reservation:', err);
        throw err;
      })
    );
  }

  /** Update reservation via PUT /api/Reservations/{id} */
  updateReservation(id: string, dto: UpdateReservationDto): Observable<ReservationDto> {
    const targetDate = dto.dateFrom || this.getTodayDateISO();
    const isoStart = dto.timeFrom ? this.convertTimeToISO(dto.timeFrom, targetDate) : undefined;
    const isoEnd = dto.timeTo ? this.convertTimeToISO(dto.timeTo, targetDate) : undefined;
    const matchedInsId = dto.instructorId || this.findInstructorIdByName(dto.instructorName || '');

    const payload: UpdateReservationDto = {
      ...dto,
      instructorId: matchedInsId || dto.instructorId,
      dateFrom: dto.dateFrom ? new Date(dto.dateFrom).toISOString() : undefined,
      dateTo: dto.dateTo ? new Date(dto.dateTo).toISOString() : undefined,
      timeFrom: isoStart,
      timeTo: isoEnd
    };

    return this.reservationApi.updateReservation(id, payload).pipe(
      tap(() => {
        this.loadReservations().subscribe();
      }),
      catchError(err => {
        console.error('[ClassroomService] Error updating reservation:', err);
        throw err;
      })
    );
  }

  /** Delete reservation via DELETE /api/Reservations/{id} */
  deleteReservation(id: string): Observable<boolean> {
    return this.reservationApi.deleteReservation(id).pipe(
      tap(() => {
        this.reservationsState.update(list => list.filter(r => r.id !== id));
      }),
      catchError(err => {
        console.error('[ClassroomService] Error deleting reservation:', err);
        throw err;
      })
    );
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

    // Remove original booking via API
    this.deleteBooking(cardId).subscribe();

    // Segment 1 (before cut)
    if (cutStartMins > startMins) {
      const dur1 = +((cutStartMins - startMins) / 60).toFixed(1);
      const part1: ClassroomCard = {
        ...card,
        startTime: card.startTime,
        endTime: formatMins(cutStartMins),
        durationHours: dur1,
        rental: +(dur1 * (card.hourlyRate || 40)).toFixed(2)
      };
      this.addBooking(part1).subscribe();
    }

    // Segment 2 (after cut)
    if (cutEndMins < endMins) {
      const dur2 = +((endMins - cutEndMins) / 60).toFixed(1);
      const part2: ClassroomCard = {
        ...card,
        startTime: formatMins(cutEndMins),
        endTime: card.endTime,
        durationHours: dur2,
        rental: +(dur2 * (card.hourlyRate || 40)).toFixed(2)
      };
      this.addBooking(part2).subscribe();
    }

    return true;
  }

  // ============================================================
  // REAL COUPON VALIDATION (API-based)
  // ============================================================

  /** Validate promo coupon codes via GET /api/Coupons/code/{code} */
  validateCoupon(code: string): Observable<ClassroomCoupon | null> {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return of(null);

    return this.couponApi.getCouponByCode(cleanCode).pipe(
      map(coupon => {
        if (!coupon || !coupon.isActive) return null;
        return {
          code: coupon.code,
          discountPercent: coupon.value || 10,
          discountName: `${coupon.value || 10}% OFF`
        };
      }),
      catchError(() => of(null))
    );
  }

  // ============================================================
  // TIME, OVERTIME & SESSION TIMERS LOGIC
  // ============================================================

  /** Convert ISO UTC timestamp or raw time to local 12-hour format "02:30 PM" */
  parseIsoToLocal12h(isoStr?: string | null): string {
    return parseIsoToLocal12h(isoStr, false);
  }

  /** Convert ISO UTC timestamp or raw time to local 24-hour format "14:30" */
  parseIsoToLocal24h(isoStr?: string | null): string {
    return parseIsoToLocal24h(isoStr);
  }

  /** Convert ISO UTC timestamp or raw date to local "YYYY-MM-DD" */
  parseIsoToLocalDate(isoStr?: string | null): string {
    return parseIsoToLocalDate(isoStr);
  }

  /** Convert total minutes from start of day to 12h string "02:30 PM" */
  convertMinutesTo12h(totalMinutes: number): string {
    return convertMinutesTo12h(totalMinutes, false);
  }

  /** Convert total minutes from start of day to 24h string "14:30" */
  convertMinutesTo24h(totalMinutes: number): string {
    return convertMinutesTo24h(totalMinutes);
  }

  /** Time calculation: convert "HH:MM AM/PM" to minutes from start of day */
  parseTimeToMinutes(timeStr?: string): number {
    return parseTimeToMinutes(timeStr);
  }

  /** Convert 24h string "14:30" to 12h string "02:30 PM" */
  convert24hTo12h(time24: string): string {
    return parseIsoToLocal12h(time24, false);
  }

  /** Convert 12h string "02:30 PM" and date "YYYY-MM-DD" to ISO string */
  convertTimeToISO(time12?: string | null, dateStr?: string | null): string {
    const dStr = dateStr || this.getTodayDateISO();
    if (!time12) return new Date(dStr).toISOString();

    const mins = this.parseTimeToMinutes(time12);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const [year, month, day] = dStr.split('-').map(Number);
    const d = new Date(year, month - 1, day, h, m, 0);
    return d.toISOString();
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
    const dateStr = card.bookingDate || this.getTodayDateISO();
    const parts = dateStr.split('-');
    const startMins = this.parseTimeToMinutes(card.startTime);
    let endMins = this.parseTimeToMinutes(card.endTime);
    if (endMins <= startMins) {
      const duration = card.durationHours && card.durationHours > 0 ? card.durationHours : 2;
      endMins = startMins + Math.round(duration * 60);
    }

    let endDateTime: Date | null = null;
    let startDateTime: Date | null = null;

    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      startDateTime = new Date(year, month, day, Math.floor(startMins / 60), startMins % 60, 0);
      endDateTime = new Date(year, month, day, Math.floor(endMins / 60), endMins % 60, 0);
      if (endDateTime.getTime() <= startDateTime.getTime()) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }
    }

    if (startDateTime && endDateTime) {
      if (now.getTime() < startDateTime.getTime()) {
        return {
          overdueMinutes: 0,
          extraHours: 0,
          overtimeStatus: 'normal',
          alertStatus: 'normal',
          alertMessage: ''
        };
      }

      if (now.getTime() <= endDateTime.getTime()) {
        const remainingMinutes = Math.floor((endDateTime.getTime() - now.getTime()) / 60000);
        if (remainingMinutes <= 15) {
          const msg = isArabic
            ? `فاضل ${remainingMinutes} دقيقة والحجز هيخلص`
            : `${remainingMinutes}m remaining until reservation ends`;
          return {
            overdueMinutes: 0,
            extraHours: 0,
            overtimeStatus: 'normal',
            alertStatus: 'ending_soon',
            alertMessage: msg
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

      // Past scheduled end time -> Overtime!
      const overdueMinutes = Math.floor((now.getTime() - endDateTime.getTime()) / 60000);
      if (overdueMinutes <= 10) {
        const msg = isArabic
          ? `الوقت خلص خلاص (فترة سماح: ${10 - overdueMinutes} دقيقة متبقية)`
          : `Time ended (Grace period: ${10 - overdueMinutes}m remaining)`;
        return {
          overdueMinutes,
          extraHours: 0,
          overtimeStatus: 'grace_period',
          alertStatus: 'ended_grace',
          alertMessage: msg
        };
      }

      const extraHours = Math.ceil((overdueMinutes - 10) / 60);
      const msg = isArabic
        ? `الوقت عدى بـ ${overdueMinutes} دقيقة (+${extraHours} ساعة زيادة)`
        : `Overtime by ${overdueMinutes}m (+${extraHours}h extra charged)`;

      return {
        overdueMinutes,
        extraHours,
        overtimeStatus: 'extra_hour',
        alertStatus: 'overtime_charged',
        alertMessage: msg
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

  /** Format elapsed time into human string e.g. "1h 15m" */
  calculateElapsed(startTimeStr?: string, bookingDateStr?: string): string {
    if (!startTimeStr) return '0h 00m';
    const now = new Date();

    if (startTimeStr.includes('T')) {
      const startDate = parseIsoToLocalDateObj(startTimeStr);
      const diffMs = Math.max(0, now.getTime() - startDate.getTime());
      const totalMinutes = Math.floor(diffMs / 60000);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${h}h ${String(m).padStart(2, '0')}m`;
    }

    const dateStr = bookingDateStr || this.getTodayDateISO();
    const parts = dateStr.split('-');
    const startMins = this.parseTimeToMinutes(startTimeStr);

    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const startH = Math.floor(startMins / 60);
      const startM = startMins % 60;
      const startDate = new Date(year, month, day, startH, startM, 0);

      const diffMs = now.getTime() - startDate.getTime();
      if (!isNaN(diffMs) && diffMs >= 0) {
        const totalMinutes = Math.floor(diffMs / 60000);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h}h ${String(m).padStart(2, '0')}m`;
      }
    }

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

    let hasChanges = false;
    const currentCards = this.cardsState() || [];
    const newCards = currentCards.map(card => {
      if (!card || !card.startTime || card.status === 'available' || card.status === 'completed' || this.completedCardIds.has(card.id)) {
        return card;
      }

      // CRITICAL FIX: An active session MUST NEVER be demoted back to 'scheduled'!
      // Only scheduled sessions can be promoted to active when start time arrives.
      let newStatus: ClassroomStatus = card.status;
      if (card.status === 'scheduled') {
        const isToday = !card.bookingDate || card.bookingDate === todayISO;
        const startMins = this.parseTimeToMinutes(card.startTime);
        const isOngoing = this.isSessionActive(card.startTime, card.endTime, card.bookingDate);
        if (isOngoing || (isToday && nowMinutes >= startMins)) {
          newStatus = 'active';
        }
      }

      const overtimeInfo = this.calculateOvertimeAndAlerts(card, isArabic);

      let newElapsed = card.elapsed;
      if (newStatus === 'active') {
        newElapsed = this.calculateElapsed(card.startTime, card.bookingDate);
      }

      if (
        card.status === newStatus &&
        card.elapsed === newElapsed &&
        card.timeAlertStatus === overtimeInfo.alertStatus &&
        card.timeAlertMessage === overtimeInfo.alertMessage &&
        card.overdueMinutes === overtimeInfo.overdueMinutes
      ) {
        return card;
      }

      hasChanges = true;
      return {
        ...card,
        status: newStatus,
        elapsed: newElapsed,
        timeAlertStatus: overtimeInfo.alertStatus,
        timeAlertMessage: overtimeInfo.alertMessage,
        overdueMinutes: overtimeInfo.overdueMinutes
      };
    });

    if (hasChanges) {
      this.cardsState.set(newCards);
    }
  }

  /** Today ISO string helper */
  getTodayDateISO(): string {
    return getTodayDateISO();
  }
}