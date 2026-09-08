import { Component, computed, inject, signal, HostListener, OnInit, OnDestroy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';
import { ClassroomService } from '../../../core/services/classroom.service';
import { PackageService } from '../../../core/services/package.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { ShiftService } from '../../../core/services/shift.service';
import { PackageItem, PackageMemberOption } from '../../../core/models/package.model';
import {
  ClassroomCard,
  SelectableRoom,
  CateringProductItem,
  PaymentMethod,
  ClassroomCoupon
} from '../../../core/models/classroom.model';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';
import { DateFilterDropdownComponent, DateFilterOption } from '../../../shared/components/date-filter-dropdown/date-filter-dropdown.component';
import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';
import { CheckoutData } from '../../../shared/components/checkout-modal/checkout.models';
import { CateringPosModalComponent, PosTargetRoom } from '../../catering/components/catering-pos-modal/catering-pos-modal.component';

@Component({
  selector: 'app-show-classroom',
  standalone: true,
  imports: [
    FormsModule,
    PrimaryButtonComponent,
    DateFilterDropdownComponent,
    CustomSelectComponent,
    CateringPosModalComponent
  ],
  templateUrl: './show-classroom.component.html',
  styleUrl: './show-classroom.component.css'
})
export class ShowClassroomComponent implements OnInit, OnDestroy {
  private langService = inject(LanguageService);
  protected classroomService = inject(ClassroomService);
  protected packageService = inject(PackageService);
  protected workspaceService = inject(WorkspaceService);
  protected shiftService = inject(ShiftService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  Math = Math;
  t = this.langService.t;
  isArabic = this.langService.isArabic;
  formatTime = (str?: string) => this.langService.formatTimeLocale(str);
  formatDuration = (str?: string) => this.langService.formatDurationLocale(str);
  formatName = (str?: string) => this.langService.formatNameLocale(str);
  formatRoom = (str?: string) => this.langService.formatRoomLocale(str);
  formatActivity = (str?: string) => this.langService.formatActivityLocale(str);
  defaultRoomImage = '/images/rooms/room-workshop.jpg';

  getRoomImage(imageUrl?: string | null): string {
    if (imageUrl && imageUrl.trim()) return imageUrl.trim();
    return this.defaultRoomImage;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = this.defaultRoomImage;
    }
  }

  private timerHandle: any = null;

  // Search & Filter Signals
  searchQuery = signal('');
  selectedStatus = signal<'all' | 'active' | 'available'>('all');
  selectedDate = signal<'today' | 'week'>('today');
  selectedDateOption = signal<DateFilterOption>('today');
  customDateValue = signal('');

  statusOptions = computed<SelectOption[]>(() => [
    { label: this.t().statusAll, value: 'all' },
    { label: this.t().statusActiveDropdown, value: 'active' },
    { label: this.t().statusAvailableDropdown, value: 'available' }
  ]);

  allCards = this.classroomService.cards;

  filteredCards = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const status = this.selectedStatus();

    const cards = this.allCards();
    const rooms = this.selectableRooms();

    const todayISO = this.classroomService.getTodayDateISO();
    const dateOpt = this.selectedDateOption();
    const customDate = this.customDateValue();

    // Find all cards that are active or scheduled matching date filter (default: today only)
    const activeOrScheduledCards = cards.filter(card => {
      if (card.status !== 'active' && card.status !== 'scheduled') return false;
      if (dateOpt === 'today') {
        const isToday = !card.bookingDate ||
                        card.bookingDate === 'Today' ||
                        card.bookingDate === todayISO ||
                        this.classroomService.parseIsoToLocalDate(card.bookingDate) === todayISO;
        return isToday || card.status === 'active';
      } else if (dateOpt === 'custom' && customDate) {
        return card.bookingDate === customDate || this.classroomService.parseIsoToLocalDate(card.bookingDate) === customDate;
      }
      return true;
    });

    // Deduplicate active/scheduled cards per room so duplicate sessions for the same room don't flash on screen
    const uniqueRoomCardsMap = new Map<string, ClassroomCard>();
    activeOrScheduledCards.forEach(card => {
      const roomKey = (card.roomId || card.name).trim().toLowerCase();
      if (!uniqueRoomCardsMap.has(roomKey)) {
        uniqueRoomCardsMap.set(roomKey, card);
      } else {
        const existing = uniqueRoomCardsMap.get(roomKey)!;
        if (card.status === 'active' && existing.status !== 'active') {
          uniqueRoomCardsMap.set(roomKey, card);
        } else if (card.status === existing.status && String(card.id) > String(existing.id)) {
          uniqueRoomCardsMap.set(roomKey, card);
        }
      }
    });

    const displayCards: ClassroomCard[] = Array.from(uniqueRoomCardsMap.values());

    // For each room, if it doesn't have an active or currently-reserved session today, append a virtual available card
    for (const room of rooms) {
      const roomKey = (room.id || room.name).trim().toLowerCase();
      const hasActiveSession = displayCards.some(
        card => (card.roomId === room.id || card.name.toLowerCase() === room.name.toLowerCase()) && (card.status === 'active' || card.status === 'scheduled')
      );
      if (!hasActiveSession) {
        displayCards.push({
          id: `virtual-avail-${room.id}`,
          name: room.name,
          activity: '',
          instructor: '',
          status: 'available',
          image: room.image,
          colorTheme: room.colorTheme,
          accentColor: room.accentColor,
          hourlyRate: room.hourlyRate,
          startTime: '',
          endTime: '',
          elapsed: '',
          rental: 0,
          catering: 0
        });
      }
    }

    return displayCards.filter(card => {
      if (status !== 'all') {
        if (status === 'active' && card.status !== 'active') return false;
        if (status === 'available' && card.status !== 'available') return false;
      }
      if (q) {
        const matchesName = card.name.toLowerCase().includes(q);
        const matchesInstructor = (card.instructor || '').toLowerCase().includes(q);
        const matchesActivity = (card.activity || '').toLowerCase().includes(q);
        if (!matchesName && !matchesInstructor && !matchesActivity) {
          return false;
        }
      }
      return true;
    });
  });

  // ============================================================
  // MODAL 1: ADD / EDIT BOOKING MODAL
  // ============================================================
  isBookingModalOpen = signal(false);
  editingCardId = signal<string | null>(null);

  bookingInstructor = signal('');
  selectedInstructorId = signal<string>('');
  bookingActivity = signal('');
  bookingPhone = signal('');
  bookingEmail = signal('');
  bookingHourlyRate = signal<number>(40);
  bookingPrintingCharges = signal<number>(0);
  bookingDate = signal('');

  todayDate = computed(() => this.classroomService.getTodayDateISO());

  isDateValid = computed(() => {
    if (!this.bookingDate()) return true;
    return this.bookingDate() >= this.todayDate();
  });

  // Segmented Time Input Signals
  startHour = signal('');
  startMinute = signal('');
  startPeriod = signal<'AM' | 'PM'>('PM');

  endHour = signal('');
  endMinute = signal('');
  endPeriod = signal<'AM' | 'PM'>('PM');

  bookingStartTime = computed(() => {
    if (!this.startHour()) return '';
    const h = this.startHour().padStart(2, '0');
    const m = (this.startMinute() || '00').padStart(2, '0');
    return `${h}:${m} ${this.startPeriod()}`;
  });

  bookingEndTime = computed(() => {
    if (!this.endHour()) return '';
    const h = this.endHour().padStart(2, '0');
    const m = (this.endMinute() || '00').padStart(2, '0');
    return `${h}:${m} ${this.endPeriod()}`;
  });

  selectableRooms = this.classroomService.rooms;
  selectedRoomId = signal('nook-1');

  isDiscountApplied = signal(false);
  discountRate = signal(0.10);

  isTimeRangeValid = computed(() => {
    if (!this.bookingStartTime() || !this.bookingEndTime()) return true;
    const startMins = this.classroomService.parseTimeToMinutes(this.bookingStartTime());
    const endMins = this.classroomService.parseTimeToMinutes(this.bookingEndTime());
    // Valid if start and end are not the exact same time
    return startMins !== endMins;
  });

  crossesMidnight = computed(() => {
    if (!this.bookingStartTime() || !this.bookingEndTime()) return false;
    const startMins = this.classroomService.parseTimeToMinutes(this.bookingStartTime());
    const endMins = this.classroomService.parseTimeToMinutes(this.bookingEndTime());
    return endMins < startMins;
  });

  bookingDurationHours = computed(() => {
    if (this.bookingStartTime() && this.bookingEndTime() && this.isTimeRangeValid()) {
      const startMins = this.classroomService.parseTimeToMinutes(this.bookingStartTime());
      const endMins = this.classroomService.parseTimeToMinutes(this.bookingEndTime());
      let diff = endMins - startMins;
      if (diff < 0) {
        // Crosses midnight
        diff += 24 * 60;
      }
      return diff > 0 ? Number((diff / 60).toFixed(1)) : 0;
    }
    return 0;
  });

  hasBookingOverlap = computed(() => {
    if (!this.bookingStartTime() || !this.bookingEndTime() || !this.bookingDate()) return false;

    const selectedRoom = this.selectableRooms().find(r => r.id === this.selectedRoomId());
    if (!selectedRoom) return false;

    const proposedRoomName = selectedRoom.name.toLowerCase();
    const proposedDate = this.bookingDate();
    const proposedStart = this.bookingStartTime();
    const proposedEnd = this.bookingEndTime();

    // Helper to parse time and get segments
    const parseTime = (t: string) => this.classroomService.parseTimeToMinutes(t);
    const getSegments = (dateISO: string, startT: string, endT: string) => {
      const s = parseTime(startT);
      const e = parseTime(endT);
      if (e < s) {
        const [y, m, d] = dateISO.split('-').map(Number);
        const nextDayObj = new Date(y, m - 1, d + 1);
        const nextDayISO = `${nextDayObj.getFullYear()}-${String(nextDayObj.getMonth() + 1).padStart(2, '0')}-${String(nextDayObj.getDate()).padStart(2, '0')}`;
        return [
          { date: dateISO, start: s, end: 1440 },
          { date: nextDayISO, start: 0, end: e }
        ];
      }
      return [{ date: dateISO, start: s, end: e }];
    };

    const proposedSegments = getSegments(proposedDate, proposedStart, proposedEnd);
    const editingId = this.editingCardId();

    return this.allCards().some(card => {
      // Skip if current card is the one we are editing
      if (editingId && card.id === editingId) return false;

      // Skip if card is available or cancelled
      if (card.status === 'available' || card.status === 'cancelled') return false;

      // Skip if different room
      if (card.name.toLowerCase() !== proposedRoomName) return false;

      if (!card.startTime || !card.endTime || !card.bookingDate) return false;

      const cardSegments = getSegments(card.bookingDate, card.startTime, card.endTime);

      // Check if any proposed segment overlaps with any card segment
      return proposedSegments.some(pSeg =>
        cardSegments.some(cSeg =>
          pSeg.date === cSeg.date && pSeg.start < cSeg.end && pSeg.end > cSeg.start
        )
      );
    });
  });

  isGenericInstructorName(name?: string | null): boolean {
    if (!name) return true;
    const n = name.trim().toLowerCase();
    if (n.length < 3) return true;
    const genericList = [
      '-',
      'محاضر',
      'المحاضر',
      'انستراكتور',
      'إنستراكتور',
      'instructor',
      'the instructor',
      'قاعة',
      'القاعة',
      'room',
      'the room',
      'عميل',
      'العميل',
      'طالب',
      'الطالب',
      'student',
      'the student',
      'ورشة',
      'ورشة عمل',
      'workshop',
      'new room',
      'class',
      'classroom'
    ];
    return genericList.includes(n);
  }

  isCardPackage(card: ClassroomCard): boolean {
    return card.paymentMode === 'package' && ((card.packageCoveredHours || 0) > 0 || !!card.packageName);
  }

  bookingPaymentMode = signal<'package' | 'cash'>('cash');

  matchedInstructorPackage = computed<PackageItem | null>(() => {
    const instructorName = this.bookingInstructor().trim().toLowerCase();
    const phone = this.bookingPhone().trim().replace(/\D/g, '');
    const email = this.bookingEmail().trim().toLowerCase();
    const selectedInsId = this.selectedInstructorId();

    const packages = this.packageService.instructorPackages();

    if (!selectedInsId && !instructorName && !phone && !email) {
      return null;
    }

    return packages.find(pkg => {
      if (pkg.status !== 'active' && pkg.status !== 'near_expiry') return false;
      if ((pkg.remainingHours || 0) <= 0) return false;

      // 1. Direct ID match
      if (selectedInsId && pkg.memberId && selectedInsId === pkg.memberId) {
        return true;
      }

      // 2. Phone match (exact digits, min 7 chars)
      const pkgPhone = (pkg.memberPhone || '').replace(/\D/g, '');
      if (phone.length >= 7 && pkgPhone.length >= 7 && (phone === pkgPhone || phone.endsWith(pkgPhone) || pkgPhone.endsWith(phone))) {
        return true;
      }

      // 3. Email match
      if (email.length >= 5 && email.includes('@') && pkg.memberEmail && pkg.memberEmail.toLowerCase() === email) {
        return true;
      }

      // 4. Exact name match (non-generic names only, min 3 chars)
      if (!this.isGenericInstructorName(instructorName)) {
        const ar = (pkg.memberNameAr || '').trim().toLowerCase();
        const en = (pkg.memberNameEn || '').trim().toLowerCase();
        if (ar && !this.isGenericInstructorName(ar) && ar === instructorName) return true;
        if (en && !this.isGenericInstructorName(en) && en === instructorName) return true;
      }

      return false;
    }) || null;
  });

  packageCoveredHours = computed(() => {
    const pkg = this.matchedInstructorPackage();
    if (!pkg || this.bookingPaymentMode() !== 'package') return 0;
    const dur = this.bookingDurationHours();
    const remaining = Math.max(0, pkg.remainingHours || 0);
    return Math.min(dur, remaining);
  });

  packageExtraHours = computed(() => {
    const pkg = this.matchedInstructorPackage();
    if (!pkg || this.bookingPaymentMode() !== 'package') return 0;
    const dur = this.bookingDurationHours();
    const remaining = Math.max(0, pkg.remainingHours || 0);
    return Math.max(0, dur - remaining);
  });

  bookingRoomRentalTotal = computed(() => {
    const dur = this.bookingDurationHours();
    const rate = this.bookingHourlyRate() || 0;

    if (this.bookingPaymentMode() === 'package' && this.matchedInstructorPackage()) {
      const extraHours = this.packageExtraHours();
      return extraHours * rate;
    }

    return rate * dur;
  });

  bookingSubtotal = computed(() => {
    return this.bookingRoomRentalTotal() + Number(this.bookingPrintingCharges() || 0);
  });

  couponCode = signal<string>('');
  appliedCoupon = signal<ClassroomCoupon | null>(null);
  couponError = signal<string>('');
  isBookingDiscountSectionOpen = signal(false);

  bookingDiscountAmount = computed(() => {
    const coupon = this.appliedCoupon();
    if (!coupon) return 0;
    return Number((this.bookingSubtotal() * (coupon.discountPercent / 100)).toFixed(2));
  });

  bookingTotal = computed(() => {
    return Math.max(0, this.bookingSubtotal() - this.bookingDiscountAmount());
  });

  isEditingBookingRate = signal(false);
  tempBookingRate = signal<number>(0);

  // ============================================================
  // MODAL 2: CHECKOUT MODAL
  // ============================================================
  isCheckoutModalOpen = signal(false);
  activeCheckoutCard = signal<ClassroomCard | null>(null);

  checkoutRoomRate = signal(0);
  checkoutDurationHours = signal(0);
  checkoutCateringAmount = signal(0.00);
  checkoutPrintingAmount = signal(0.00);
  checkoutManualAdjustment = signal(0.00);
  checkoutLoyaltyDiscount = signal(0.00);

  checkoutOverdueMinutes = signal<number>(0);
  checkoutExtraHours = signal<number>(0);
  checkoutOvertimeStatus = signal<'normal' | 'grace_period' | 'extra_hour'>('normal');
  checkoutOvertimeAlertMessage = signal<string>('');

  checkoutPaymentMethod = signal<PaymentMethod>('cash');
  checkoutAmountReceived = signal<number | null>(null);

  isDiscountSectionOpen = signal(false);
  customDiscountInput = signal<number | null>(null);

  isCateringModalOpen = signal(false);
  isCateringPosModalOpen = signal(false);
  cateringTargetRoom = signal<PosTargetRoom | null>(null);

  // ============================================================
  // SUB-MODALS
  // ============================================================
  cateringProducts = this.classroomService.canteenProducts;
  customCateringInput = signal<number | null>(null);

  isPrintingModalOpen = signal(false);
  printingNumPages = signal<number>(10);
  printingPagePrice = signal<number>(1.5);
  customPrintingInput = signal<number | null>(null);

  isRateModalOpen = signal(false);
  customRateInput = signal<number>(40);
  customDurationInput = signal<number>(2);

  // ============================================================
  // LIFECYCLE
  // ============================================================
  ngOnInit(): void {
    this.classroomService.syncWithBackend();
    this.refreshLiveStatus();
    this.timerHandle = setInterval(() => {
      this.refreshLiveStatus();
    }, 5000);

    // Watch query parameter to auto-open edit modal or checkout modal when redirected from reservations calendar
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const editId = params['edit'];
      if (editId) {
        const card = this.classroomService.getCardById(editId);
        if (card) {
          setTimeout(() => {
            this.openEditBookingModal(card);
          }, 100);
        }
      }

      const checkoutId = params['checkout'];
      if (checkoutId) {
        const card = this.classroomService.getCardById(checkoutId);
        if (card) {
          setTimeout(() => {
            this.openCheckoutModal(card);
          }, 100);
        }
      }

      const openBooking = params['openBooking'] || params['book'] || params['new'];
      if (openBooking === 'true') {
        const roomName = params['roomName'];
        setTimeout(() => {
          this.openBookingModal(roomName);
        }, 80);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  private refreshLiveStatus(): void {
    this.classroomService.refreshCardsStatus(this.isArabic());
  }

  // ============================================================
  // BOOKING MODAL ACTIONS
  // ============================================================
  openBookingModal(roomName?: string): void {
    this.editingCardId.set(null);
    this.bookingInstructor.set('');
    this.selectedInstructorId.set('');
    this.isEditingBookingRate.set(false);
    this.couponCode.set('');
    this.appliedCoupon.set(null);
    this.couponError.set('');

    if (roomName) {
      const match = this.selectableRooms().find(r => r.name.toLowerCase() === roomName.toLowerCase());
      if (match) {
        this.selectedRoomId.set(match.id);
        this.bookingHourlyRate.set(match.hourlyRate);
      }
    }

    this.bookingInstructor.set('');
    this.bookingActivity.set('');
    this.bookingPhone.set('');
    this.bookingEmail.set('');
    this.bookingPrintingCharges.set(0);
    this.bookingDate.set(this.todayDate());
    this.startHour.set('');
    this.startMinute.set('');
    this.startPeriod.set('PM');
    this.endHour.set('');
    this.endMinute.set('');
    this.endPeriod.set('PM');
    this.isDiscountApplied.set(false);
    this.isBookingDiscountSectionOpen.set(false);
    this.bookingPaymentMode.set('cash');

    this.isBookingModalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  openEditBookingModal(card: ClassroomCard): void {
    this.editingCardId.set(card.id);
    const match = this.selectableRooms().find(r => r.name.toLowerCase() === card.name.toLowerCase());
    if (match) {
      this.selectedRoomId.set(match.id);
    }
    this.bookingInstructor.set(card.instructor || '');
    this.selectedInstructorId.set(card.instructorId || '');
    this.bookingActivity.set(card.activity || '');
    this.bookingPhone.set(card.phone || '');
    this.bookingEmail.set(card.email || '');
    this.bookingHourlyRate.set(card.hourlyRate || 40);
    this.bookingPrintingCharges.set(card.printingCharges || 0);
    this.bookingDate.set(card.bookingDate || this.todayDate());

    if (card.startTime) {
      const matchStart = card.startTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (matchStart) {
        this.startHour.set(matchStart[1].padStart(2, '0'));
        this.startMinute.set(matchStart[2].padStart(2, '0'));
        this.startPeriod.set((matchStart[3]?.toUpperCase() as 'AM' | 'PM') || 'PM');
      }
    }
    if (card.endTime) {
      const matchEnd = card.endTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (matchEnd) {
        this.endHour.set(matchEnd[1].padStart(2, '0'));
        this.endMinute.set(matchEnd[2].padStart(2, '0'));
        this.endPeriod.set((matchEnd[3]?.toUpperCase() as 'AM' | 'PM') || 'PM');
      }
    }

    const hasPkg = (card.paymentMode === 'package' && (card.packageCoveredHours || 0) > 0);
    this.bookingPaymentMode.set(hasPkg ? 'package' : 'cash');

    this.isBookingModalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeBookingModal(): void {
    this.isBookingModalOpen.set(false);
    this.editingCardId.set(null);
    document.body.style.overflow = '';
  }

  selectRoom(roomId: string): void {
    this.selectedRoomId.set(roomId);
    const room = this.selectableRooms().find(r => r.id === roomId);
    if (room) {
      this.bookingHourlyRate.set(room.hourlyRate);
    }
  }

  toggleDiscount(): void {
    this.isDiscountApplied.update(v => !v);
  }

  // Validation Signals
  isInstructorValid = computed(() => {
    const val = this.bookingInstructor().trim();
    return val.length >= 3 && val.length <= 50;
  });

  isActivityValid = computed(() => {
    const val = this.bookingActivity().trim();
    return val.length >= 2 && val.length <= 60;
  });

  isPhoneValid = computed(() => {
    const val = this.bookingPhone().trim();
    if (!val) return true; // Optional field
    return val.length === 11;
  });

  isEmailValid = computed(() => {
    const val = this.bookingEmail().trim();
    if (!val) return true; // Optional field
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return val.length <= 80 && regex.test(val);
  });

  onInstructorInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[^a-zA-Z\s\u0600-\u06FF.]/g, '').substring(0, 50);
    input.value = cleaned;
    this.bookingInstructor.set(cleaned);
    if (!this.matchedInstructorPackage()) {
      this.bookingPaymentMode.set('cash');
    }
  }

  onActivityInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[^a-zA-Z0-9\s\u0600-\u06FF().,-]/g, '').substring(0, 60);
    input.value = cleaned;
    this.bookingActivity.set(cleaned);
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/\D/g, '').substring(0, 11);
    input.value = cleaned;
    this.bookingPhone.set(cleaned);
  }

  onEmailInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.substring(0, 80);
    input.value = cleaned;
    this.bookingEmail.set(cleaned);
  }

  isInstructorDropdownOpen = signal(false);

  allSearchableMembers = computed<PackageMemberOption[]>(() => {
    const list: PackageMemberOption[] = [];
    const seen = new Set<string>();

    const addMember = (m: PackageMemberOption) => {
      const name = (m.nameAr || m.nameEn || '').trim().toLowerCase();
      if (!name || this.isGenericInstructorName(name)) return;
      const cleanPhone = (m.phone || '').replace(/\D/g, '');
      const key = `${name}_${cleanPhone}`;
      if (seen.has(key) || (m.id && seen.has(m.id))) {
        return;
      }
      seen.add(key);
      if (m.id) seen.add(m.id);
      list.push(m);
    };

    // 1. All member options from packageService (includes both instructors and students)
    for (const m of this.packageService.memberOptions()) {
      addMember(m);
    }

    // 2. Members holding an instructor package (Classroom Package)
    for (const pkg of this.packageService.instructorPackages()) {
      const name = pkg.memberNameAr || pkg.memberNameEn || '';
      addMember({
        id: pkg.memberId || pkg.id,
        nameAr: pkg.memberNameAr,
        nameEn: pkg.memberNameEn,
        subAr: pkg.memberSubAr || (this.isArabic() ? 'محاضر معتمد' : 'Certified Instructor'),
        subEn: pkg.memberSubEn || 'Certified Instructor',
        phone: pkg.memberPhone || '',
        email: pkg.memberEmail || '',
        type: 'instructor'
      });
    }

    // 3. Students from backend workspace directory
    for (const s of this.workspaceService.backendStudents()) {
      const name = (s.name || '').trim();
      const phone = s.phone || s.whatsapp || '';
      addMember({
        id: s.id || (phone ? `STU-${phone.replace(/\D/g, '').slice(-4)}` : undefined) || `STU-${Date.now()}`,
        nameAr: name,
        nameEn: name,
        subAr: s.faculty || s.college || (this.isArabic() ? 'طالب' : 'Student'),
        subEn: s.faculty || s.college || 'Student',
        phone: phone,
        email: s.email || '',
        type: 'student'
      });
    }

    // 4. Students active in workspace
    for (const s of this.workspaceService.activeStudents()) {
      const name = (s.name || '').trim();
      const phone = s.phone || s.whatsapp || '';
      addMember({
        id: s.studentId || s.id,
        nameAr: name,
        nameEn: name,
        subAr: s.faculty || s.college || (this.isArabic() ? 'طالب' : 'Student'),
        subEn: s.faculty || s.college || 'Student',
        phone: phone,
        email: s.email || '',
        type: 'student'
      });
    }

    return list;
  });

  instructorOptions = computed(() => {
    const query = this.bookingInstructor().trim().toLowerCase();
    const allMembers = this.allSearchableMembers();
    if (!query) {
      return allMembers;
    }
    return allMembers.filter(m =>
      (m.nameAr || '').toLowerCase().includes(query) ||
      (m.nameEn || '').toLowerCase().includes(query) ||
      (m.phone || '').includes(query) ||
      (m.email && m.email.toLowerCase().includes(query)) ||
      (m.subAr && m.subAr.toLowerCase().includes(query)) ||
      (m.subEn && m.subEn.toLowerCase().includes(query))
    );
  });

  isNewInstructorQuery = computed(() => {
    const query = this.bookingInstructor().trim();
    if (!query || query.length < 2) return false;
    const lower = query.toLowerCase();
    const allMembers = this.allSearchableMembers();
    return !allMembers.some(m =>
      (m.nameAr || '').toLowerCase() === lower ||
      (m.nameEn || '').toLowerCase() === lower
    );
  });

  addNewInstructorFromQuery(): void {
    const name = this.bookingInstructor().trim();
    if (!name) return;
    const newMember = this.packageService.addOrUpdateMember({
      nameAr: name,
      nameEn: name,
      phone: this.bookingPhone().trim(),
      email: this.bookingEmail().trim(),
      subAr: this.bookingActivity().trim() || (this.isArabic() ? 'محاضر / عميل' : 'Instructor / Client'),
      subEn: this.bookingActivity().trim() || 'Instructor / Client',
      type: 'instructor'
    });
    this.selectInstructor(newMember);
  }

  hasInstructorActivePackage(member: PackageMemberOption): boolean {
    const packages = this.packageService.instructorPackages();
    const mPhone = (member.phone || '').replace(/\D/g, '');
    const mEmail = (member.email || '').trim().toLowerCase();
    const mAr = (member.nameAr || '').trim().toLowerCase();
    const mEn = (member.nameEn || '').trim().toLowerCase();

    return packages.some(p => {
      if (p.type !== 'instructor') return false;
      if (p.status !== 'active' && p.status !== 'near_expiry') return false;
      if ((p.remainingHours || 0) <= 0) return false;

      if (p.memberId && member.id && p.memberId === member.id) return true;

      const pPhone = (p.memberPhone || '').replace(/\D/g, '');
      if (mPhone.length >= 7 && pPhone.length >= 7 && (mPhone === pPhone || mPhone.endsWith(pPhone) || pPhone.endsWith(mPhone))) {
        return true;
      }

      if (mEmail.length >= 5 && mEmail.includes('@') && p.memberEmail && p.memberEmail.toLowerCase() === mEmail) {
        return true;
      }

      if (!this.isGenericInstructorName(mAr)) {
        const pAr = (p.memberNameAr || '').trim().toLowerCase();
        if (pAr && !this.isGenericInstructorName(pAr) && pAr === mAr) return true;
      }

      if (!this.isGenericInstructorName(mEn)) {
        const pEn = (p.memberNameEn || '').trim().toLowerCase();
        if (pEn && !this.isGenericInstructorName(pEn) && pEn === mEn) return true;
      }

      return false;
    });
  }

  selectInstructor(member: PackageMemberOption): void {
    const name = this.isArabic() ? member.nameAr : member.nameEn;
    this.bookingInstructor.set(name);
    this.selectedInstructorId.set(member.id);
    if (member.phone) {
      this.bookingPhone.set(member.phone);
    }
    if (member.email) {
      this.bookingEmail.set(member.email);
    }
    if (member.subAr && !this.bookingActivity()) {
      this.bookingActivity.set(this.isArabic() ? member.subAr : (member.subEn || member.subAr));
    }
    this.isInstructorDropdownOpen.set(false);

    if (this.hasInstructorActivePackage(member)) {
      this.bookingPaymentMode.set('package');
    } else {
      this.bookingPaymentMode.set('cash');
    }
  }

  clearBookingInstructor(): void {
    this.bookingInstructor.set('');
    this.selectedInstructorId.set('');
    this.isInstructorDropdownOpen.set(false);
  }

  setStartTimeToNow(): void {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;

    this.startHour.set(String(hours).padStart(2, '0'));
    this.startMinute.set(String(minutes).padStart(2, '0'));
    this.startPeriod.set(period);

    if (!this.bookingDate()) {
      this.bookingDate.set(this.todayDate());
    }

    if (!this.endHour()) {
      const endTotalH = now.getHours() + 2;
      let endH = endTotalH % 12;
      if (endH === 0) endH = 12;
      const endPer: 'AM' | 'PM' = (endTotalH % 24) >= 12 ? 'PM' : 'AM';
      this.endHour.set(String(endH).padStart(2, '0'));
      this.endMinute.set(String(minutes).padStart(2, '0'));
      this.endPeriod.set(endPer);
    }
  }

  applyBookingPercentDiscount(percent: number): void {
    const percentInt = Math.round(percent * 100);
    this.appliedCoupon.set({
      code: `${percentInt}%`,
      discountPercent: percentInt,
      discountName: `${percentInt}% ${this.t().discount}`
    });
    this.couponError.set('');
    this.isBookingDiscountSectionOpen.set(false);
  }

  applyCoupon(): void {
    const code = this.couponCode().trim();
    if (!code) {
      this.couponError.set(this.t().pleaseEnterCoupon);
      return;
    }
    this.classroomService.validateCoupon(code).subscribe(coupon => {
      if (coupon) {
        this.appliedCoupon.set(coupon);
        this.couponError.set('');
        this.isBookingDiscountSectionOpen.set(false);
      } else {
        this.couponError.set(this.t().invalidCoupon);
      }
    });
  }

  removeCoupon(): void {
    this.appliedCoupon.set(null);
    this.couponCode.set('');
    this.couponError.set('');
  }

  startEditingBookingRate(): void {
    this.tempBookingRate.set(this.bookingHourlyRate());
    this.isEditingBookingRate.set(true);
  }

  saveBookingRate(): void {
    const rate = Math.max(0, Number(this.tempBookingRate()) || 0);
    this.bookingHourlyRate.set(rate);
    this.isEditingBookingRate.set(false);
  }

  isBookingFormValid = computed(() => {
    const hasInstructor = !!this.bookingInstructor().trim() && this.isInstructorValid();
    const hasActivity = !!this.bookingActivity().trim() && this.isActivityValid();
    const hasDate = !!this.bookingDate().trim() && this.isDateValid();
    const hasHourlyRate = Number(this.bookingHourlyRate()) > 0;
    const hasTimes = !!this.bookingStartTime() && !!this.bookingEndTime();
    const validRange = this.isTimeRangeValid() && this.bookingDurationHours() > 0;
    const noOverlap = !this.hasBookingOverlap();
    const validPhone = this.isPhoneValid();
    const validEmail = this.isEmailValid();
    return hasInstructor && hasActivity && hasDate && hasHourlyRate && hasTimes && validRange && noOverlap && validPhone && validEmail;
  });

  confirmNewBooking(): void {
    if (!this.isBookingFormValid()) return;

    const selectedRoom = this.selectableRooms().find(r => r.id === this.selectedRoomId());
    const duration = this.bookingDurationHours();
    const isOngoing = this.classroomService.isSessionActive(this.bookingStartTime(), this.bookingEndTime(), this.bookingDate());
    const cardStatus = isOngoing ? 'active' : 'scheduled';
    const initialElapsed = isOngoing
      ? this.classroomService.calculateElapsed(this.bookingStartTime(), this.bookingDate())
      : `${duration}h session`;

    const pkg = this.matchedInstructorPackage();
    const isPkg = this.bookingPaymentMode() === 'package' && !!pkg && (pkg.remainingHours || 0) > 0;
    const coveredHours = isPkg ? this.packageCoveredHours() : 0;
    const extraHours = isPkg ? this.packageExtraHours() : 0;
    const paymentModeToSave: 'package' | 'cash' = isPkg ? 'package' : 'cash';
    const rentalAmount = this.bookingRoomRentalTotal();

    // Auto-save/update instructor in the database
    const instructorName = this.bookingInstructor().trim();
    if (instructorName) {
      const existingMember = this.packageService.memberOptions().find(m =>
        (this.selectedInstructorId() && m.id === this.selectedInstructorId()) ||
        (this.bookingPhone().trim() && m.phone === this.bookingPhone().trim()) ||
        (m.nameAr && m.nameAr.toLowerCase() === instructorName.toLowerCase()) ||
        (m.nameEn && m.nameEn.toLowerCase() === instructorName.toLowerCase())
      );
      const memberType = existingMember?.type || 'instructor';

      this.packageService.addOrUpdateMember({
        id: this.selectedInstructorId() || undefined,
        nameAr: instructorName,
        nameEn: instructorName,
        phone: this.bookingPhone().trim(),
        email: this.bookingEmail().trim(),
        subAr: this.bookingActivity().trim() || (memberType === 'student' ? 'طالب' : 'محاضر'),
        subEn: this.bookingActivity().trim() || (memberType === 'student' ? 'Student' : 'Instructor'),
        type: memberType
      });
    }

    const editId = this.editingCardId();
    if (editId) {
      const existing = this.classroomService.getCardById(editId);
      if (existing) {
        this.classroomService.updateCard({
          ...existing,
          roomId: selectedRoom ? selectedRoom.id : existing.roomId,
          instructorId: this.selectedInstructorId() || existing.instructorId || undefined,
          name: selectedRoom ? selectedRoom.name : existing.name,
          activity: this.bookingActivity() || existing.activity,
          instructor: instructorName || existing.instructor,
          phone: this.bookingPhone() || existing.phone,
          email: this.bookingEmail() || existing.email,
          paymentMode: paymentModeToSave,
          packageName: isPkg && pkg ? (this.isArabic() ? pkg.packageNameAr : pkg.packageNameEn) : undefined,
          packageCoveredHours: coveredHours,
          packageExtraHours: extraHours,
          status: cardStatus,
          startTime: this.bookingStartTime(),
          endTime: this.bookingEndTime(),
          bookingDate: this.bookingDate(),
          elapsed: initialElapsed,
          rental: rentalAmount
        }).subscribe({
          next: () => {
            this.workspaceService.showToast(this.isArabic() ? 'تم تحديث حجز القاعة بنجاح!' : 'Room booking updated successfully!', 'success');
            this.classroomService.syncWithBackend();
          },
          error: (err) => {
            const errorMsg = err?.error?.message || err?.message || (this.isArabic() ? 'فشل تحديث حجز القاعة' : 'Failed to update classroom booking');
            this.workspaceService.showToast(errorMsg, 'error');
          }
        });
      }
    } else {
      const newCard: ClassroomCard = {
        id: '',
        roomId: selectedRoom?.id,
        instructorId: this.selectedInstructorId() || undefined,
        name: selectedRoom ? selectedRoom.name : 'New Room',
        activity: this.bookingActivity() || 'Workshop',
        instructor: instructorName || 'Instructor',
        phone: this.bookingPhone(),
        email: this.bookingEmail(),
        paymentMode: paymentModeToSave,
        packageName: isPkg && pkg ? (this.isArabic() ? pkg.packageNameAr : pkg.packageNameEn) : undefined,
        packageCoveredHours: coveredHours,
        packageExtraHours: extraHours,
        status: cardStatus,
        image: selectedRoom?.image || '',
        colorTheme: selectedRoom?.colorTheme || 'blue',
        accentColor: selectedRoom?.accentColor || '#2563eb',
        hourlyRate: this.bookingHourlyRate(),
        printingCharges: this.bookingPrintingCharges(),
        startTime: this.bookingStartTime(),
        endTime: this.bookingEndTime(),
        bookingDate: this.bookingDate(),
        durationHours: duration,
        elapsed: initialElapsed,
        rental: rentalAmount,
        catering: 0
      };
      this.classroomService.addBooking(newCard).subscribe({
        next: () => {
          this.workspaceService.showToast(this.isArabic() ? 'تم تأكيد وحفظ حجز القاعة بنجاح!' : 'Room booking confirmed and saved successfully!', 'success');
          this.classroomService.syncWithBackend();
        },
        error: (err) => {
          const errorMsg = err?.error?.message || err?.message || (this.isArabic() ? 'فشل حفظ حجز القاعة في السيرفر' : 'Failed to save classroom booking');
          this.workspaceService.showToast(errorMsg, 'error');
        }
      });
    }

    // Deduct actual covered hours from package
    if (isPkg && pkg && coveredHours > 0) {
      this.packageService.recordSessionUsage(pkg.id, {
        date: `${this.bookingDate()} ${this.bookingStartTime()}`,
        duration: coveredHours,
        sessionAr: `${this.bookingActivity() || 'حجز قاعة'} - ${selectedRoom ? selectedRoom.name : 'قاعة'}`,
        sessionEn: `${this.bookingActivity() || 'Classroom Session'} - ${selectedRoom ? selectedRoom.name : 'Room'}`,
        roomOrDesk: selectedRoom ? selectedRoom.name : 'Classroom'
      });
    }

    this.closeBookingModal();
  }

  // Checkout Billing Mode ('package' | 'cash')
  checkoutBillingMode = signal<'package' | 'cash'>('cash');

  // Find matching instructor package for active checkout card
  checkoutMatchedPackage = computed<PackageItem | null>(() => {
    const card = this.activeCheckoutCard();
    if (!card) return null;

    const instructorName = (card.instructor || '').trim().toLowerCase();
    const phone = (card.phone || '').trim().replace(/\D/g, '');
    const email = (card.email || '').trim().toLowerCase();

    const packages = this.packageService.instructorPackages();

    return packages.find(pkg => {
      if (pkg.status !== 'active' && pkg.status !== 'near_expiry') return false;
      if ((pkg.remainingHours || 0) <= 0) return false;

      // 1. Direct ID match
      if (card.instructorId && pkg.memberId && card.instructorId === pkg.memberId) {
        return true;
      }

      // 2. Phone match (min 7 digits)
      const pkgPhone = (pkg.memberPhone || '').replace(/\D/g, '');
      if (phone.length >= 7 && pkgPhone.length >= 7 && (phone === pkgPhone || phone.endsWith(pkgPhone) || pkgPhone.endsWith(phone))) {
        return true;
      }

      // 3. Email match
      if (email.length >= 5 && email.includes('@') && pkg.memberEmail && pkg.memberEmail.toLowerCase() === email) {
        return true;
      }

      // 4. Exact name match (non-generic names only, min 3 chars)
      if (!this.isGenericInstructorName(instructorName)) {
        const ar = (pkg.memberNameAr || '').trim().toLowerCase();
        const en = (pkg.memberNameEn || '').trim().toLowerCase();
        if (ar && !this.isGenericInstructorName(ar) && ar === instructorName) return true;
        if (en && !this.isGenericInstructorName(en) && en === instructorName) return true;
      }

      return false;
    }) || null;
  });

  hasPackageAvailableForCheckout = computed(() => {
    const card = this.activeCheckoutCard();
    if (!card) return false;
    const matchedPkg = this.checkoutMatchedPackage();
    return !!matchedPkg && (matchedPkg.remainingHours || 0) > 0;
  });

  toggleCheckoutBillingMode(): void {
    if (!this.hasPackageAvailableForCheckout()) {
      this.checkoutBillingMode.set('cash');
      return;
    }
    const current = this.checkoutBillingMode();
    this.checkoutBillingMode.set(current === 'package' ? 'cash' : 'package');
  }

  isCheckoutPackage = computed(() => {
    const card = this.activeCheckoutCard();
    if (!card) return false;
    if (this.checkoutBillingMode() !== 'package') return false;

    // Has a valid active package with remaining hours
    const matchedPkg = this.checkoutMatchedPackage();
    const hasValidPkg = !!matchedPkg && (matchedPkg.remainingHours || 0) > 0;

    // OR was booked and package hours were already deducted at booking time
    const hadBookedPkg = (card.packageCoveredHours || 0) > 0 || (card.paymentMode === 'package' && !!card.packageName);

    return hasValidPkg || hadBookedPkg;
  });

  checkoutPackageCoveredHours = computed(() => {
    if (!this.isCheckoutPackage()) return 0;
    const pkg = this.checkoutMatchedPackage();
    const dur = this.checkoutDurationHours();
    const card = this.activeCheckoutCard();

    const remaining = pkg ? (pkg.remainingHours || 0) : (card?.packageCoveredHours || 0);
    return Math.min(dur, Math.max(0, remaining));
  });

  checkoutPackageExtraHours = computed(() => {
    if (!this.isCheckoutPackage()) return 0;
    const dur = this.checkoutDurationHours();
    const covered = this.checkoutPackageCoveredHours();
    return Math.max(0, dur - covered);
  });

  checkoutRoomRentalTotal = computed(() => {
    const dur = this.checkoutDurationHours();
    const rate = this.checkoutRoomRate();

    if (this.isCheckoutPackage()) {
      const extra = this.checkoutPackageExtraHours();
      return +(extra * rate).toFixed(2);
    }

    return +(rate * dur).toFixed(2);
  });

  checkoutSubtotal = computed(() => {
    return this.checkoutRoomRentalTotal() + this.checkoutCateringAmount() + this.checkoutPrintingAmount();
  });

  checkoutFinalAmount = computed(() => {
    return Math.max(0, this.checkoutSubtotal() - this.checkoutManualAdjustment() - this.checkoutLoyaltyDiscount());
  });

  checkoutChangeDue = computed(() => {
    const received = this.checkoutAmountReceived();
    if (received === null || received === undefined || isNaN(received)) return 0;
    const change = received - this.checkoutFinalAmount();
    return change >= 0 ? change : 0;
  });

  isCheckoutPaymentValid = computed(() => {
    const finalAmt = this.checkoutFinalAmount();
    if (finalAmt <= 0) return true;
    const received = this.checkoutAmountReceived();
    if (received === null || received === undefined || isNaN(received)) return false;
    return received >= finalAmt;
  });

  classroomCheckoutData = computed<CheckoutData | null>(() => {
    const card = this.activeCheckoutCard();
    if (!card) return null;
    const isPkg = this.isCheckoutPackage();

    return {
      type: 'classroom',
      title: this.t().classroomCheckout,
      subtitle: `${this.t().finalizingSessionFor} ${card.name} - ${card.instructor}`,
      session: {
        activity: card.activity || card.name,
        status: card.status || 'completed',
        startTime: card.startTime || '10:00 AM',
        endTime: card.endTime || '12:00 PM',
        duration: `${this.checkoutDurationHours()}h 00m`
      },
      financialBreakdown: {
        items: [
          {
            icon: 'clock',
            title: this.t().roomRental,
            subtitle: isPkg
              ? (this.checkoutPackageCoveredHours() > 0
                  ? `${this.checkoutPackageCoveredHours()} ${this.t().hrs} ${this.t().deductedFromPackage}${this.checkoutPackageExtraHours() > 0 ? ` + ${this.checkoutPackageExtraHours()} ${this.t().hrs} (${this.checkoutRoomRate()} ${this.t().currency})` : ''}`
                  : this.t().deductedFromPackage)
              : `${this.checkoutRoomRate()} ${this.t().currency}/${this.t().hrs} × ${this.checkoutDurationHours()} ${this.t().hrs}`,
            amount: this.checkoutRoomRentalTotal(),
            canEdit: !isPkg
          },
          {
            icon: 'canteen',
            title: this.t().canteenAndDrinks,
            subtitle: this.t().cateringSubtitle,
            amount: this.checkoutCateringAmount(),
            isCatering: true,
            canAdd: true,
            buttonLabel: this.t().addCateringLabel
          },
          {
            icon: 'printing',
            title: this.t().printingAndPhotocopy,
            subtitle: this.t().handouts,
            amount: this.checkoutPrintingAmount(),
            isPrinting: true,
            canEdit: true
          }
        ],
        subtotal: this.checkoutSubtotal(),
        discountPercent: this.checkoutLoyaltyDiscount() > 0 ? Math.round((this.checkoutLoyaltyDiscount() / (this.checkoutSubtotal() || 1)) * 100) : 0,
        loyaltyDiscount: this.checkoutLoyaltyDiscount(),
        manualAdjustment: this.checkoutManualAdjustment(),
        finalTotal: this.checkoutFinalAmount()
      },
      payment: {
        selectedMethod: this.checkoutPaymentMethod(),
        amountReceived: this.checkoutAmountReceived(),
        changeDue: this.checkoutChangeDue(),
        buttonText: this.t().btnProcessCheckout
      }
    };
  });

  openCheckoutModal(card: ClassroomCard): void {
    this.activeCheckoutCard.set(card);
    this.classroomService.setActiveCheckoutCard(card);

    let agreedHours = card.durationHours || 2;
    let startMins = 0;
    let endMins = 0;

    if (card.startTime && card.endTime) {
      startMins = this.classroomService.parseTimeToMinutes(card.startTime);
      endMins = this.classroomService.parseTimeToMinutes(card.endTime);
      const diff = endMins - startMins;
      if (diff > 0) {
        agreedHours = Math.max(1, Math.round(diff / 60));
      }
    }

    const overtimeInfo = this.classroomService.calculateOvertimeAndAlerts(card, this.isArabic());
    this.checkoutOverdueMinutes.set(overtimeInfo.overdueMinutes);
    this.checkoutExtraHours.set(overtimeInfo.extraHours);
    this.checkoutOvertimeStatus.set(overtimeInfo.overtimeStatus);
    this.checkoutOvertimeAlertMessage.set(overtimeInfo.alertMessage);

    const totalBilledHours = agreedHours + overtimeInfo.extraHours;
    const hourlyRate = card.hourlyRate || (card.rental && agreedHours ? Math.round(card.rental / agreedHours) : 40);
    const catering = card.catering || 0;
    const printing = card.printingCharges !== undefined ? card.printingCharges : 0;

    this.checkoutRoomRate.set(hourlyRate);
    this.checkoutDurationHours.set(totalBilledHours);
    this.checkoutCateringAmount.set(catering);
    this.checkoutPrintingAmount.set(printing);
    this.checkoutManualAdjustment.set(0);
    this.checkoutLoyaltyDiscount.set(0);
    this.checkoutAmountReceived.set(0);

    // Auto-detect if instructor has an active package with remaining hours or card booked with package hours
    const matchedPkg = this.checkoutMatchedPackage();
    const hasValidPkg = !!matchedPkg && (matchedPkg.remainingHours || 0) > 0;
    const hadBookedPkg = (card.packageCoveredHours || 0) > 0 || (card.paymentMode === 'package' && !!card.packageName);

    const hasPackage = hasValidPkg || hadBookedPkg;
    this.checkoutBillingMode.set(hasPackage ? 'package' : 'cash');

    this.isCheckoutModalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeCheckoutModal(): void {
    this.isCheckoutModalOpen.set(false);
    this.activeCheckoutCard.set(null);
    this.classroomService.setActiveCheckoutCard(null);
    document.body.style.overflow = '';
  }

  onAddCatering(card: ClassroomCard): void {
    this.cateringTargetRoom.set({
      id: card.id,
      name: card.name,
      instructor: card.instructor,
      currentCatering: card.catering || 0,
      items: card.cateringItems || []
    });
    this.isCateringPosModalOpen.set(true);
  }

  onAddToRoomSession(event: { roomId: string; items: any[]; total: number }): void {
    const formattedItems = (event.items || []).map(i => {
      const prodId = i.productId || i.product?.id || i.id;
      const unitPrice = Number(i.unitPrice ?? i.price ?? i.product?.sellingPrice ?? i.product?.piecePrice ?? 0);
      const qty = Number(i.quantity || 1);
      const totalPrice = Number(i.totalPrice ?? i.total ?? (unitPrice * qty));
      return {
        id: i.id || prodId || `${Date.now()}_${Math.random()}`,
        productId: prodId,
        product: i.product,
        name: i.product?.name || i.name || 'منتج كاترنج',
        nameAr: i.product?.nameAr || i.nameAr || i.product?.name || i.name,
        unitPrice: unitPrice,
        price: unitPrice,
        quantity: qty,
        totalPrice: totalPrice,
        total: totalPrice,
        time: this.t().now
      };
    });

    if (event.roomId) {
      this.classroomService.addCatering(event.roomId, event.total, formattedItems);
    }
    if (this.isCheckoutModalOpen()) {
      this.checkoutCateringAmount.update(amt => +(amt + event.total).toFixed(2));
      this.activeCheckoutCard.update(c => c ? {
        ...c,
        catering: +((c.catering || 0) + event.total).toFixed(2),
        cateringItems: [...(c.cateringItems || []), ...formattedItems]
      } : c);
    }
    this.isCateringPosModalOpen.set(false);
  }

  selectPaymentMethod(method: PaymentMethod): void {
    this.checkoutPaymentMethod.set(method);
    if (method !== 'cash') {
      this.checkoutAmountReceived.set(this.checkoutFinalAmount());
    }
  }

  applyPercentDiscount(percent: number): void {
    const discountVal = Number((this.checkoutSubtotal() * percent).toFixed(2));
    this.checkoutLoyaltyDiscount.set(discountVal);
    this.isDiscountSectionOpen.set(false);
  }

  applyCustomDiscount(): void {
    const discountVal = Number(this.customDiscountInput()) || 0;
    this.checkoutManualAdjustment.set(discountVal);
    this.customDiscountInput.set(null);
    this.isDiscountSectionOpen.set(false);
  }

  confirmProcessCheckout(): void {
    if (!this.isCheckoutPaymentValid()) return;

    const currentCard = this.activeCheckoutCard();
    if (currentCard) {
      const finalAmt = this.checkoutFinalAmount();
      const isPkg = this.isCheckoutPackage();
      const coveredHours = this.checkoutPackageCoveredHours();
      const matchedPkg = this.checkoutMatchedPackage();

      // 1. Deduct hours from package if applicable
      if (isPkg && coveredHours > 0 && matchedPkg) {
        this.packageService.recordSessionUsage(matchedPkg.id, {
          duration: coveredHours,
          date: this.classroomService.getTodayDateISO(),
          sessionAr: `جلسة قاعة ${currentCard.name} (${currentCard.activity || 'ورشة عمل'})`,
          sessionEn: `Classroom session: ${currentCard.name} (${currentCard.activity || 'Workshop'})`,
          roomOrDesk: currentCard.name
        });
      }

      // 2. Checkout room
      const received = this.checkoutAmountReceived() ?? finalAmt;
      this.classroomService.checkoutRoom(currentCard.id, {
        cardId: currentCard.id,
        roomRate: this.checkoutRoomRate(),
        durationHours: this.checkoutDurationHours(),
        cateringAmount: this.checkoutCateringAmount(),
        printingAmount: this.checkoutPrintingAmount(),
        manualAdjustment: this.checkoutManualAdjustment(),
        loyaltyDiscount: this.checkoutLoyaltyDiscount(),
        paymentMethod: isPkg && finalAmt === 0 ? 'package' : this.checkoutPaymentMethod(),
        amountReceived: received,
        finalAmount: finalAmt,
        changeDue: this.checkoutChangeDue()
      }).subscribe({
        error: (err) => console.error('Failed to checkout room:', err)
      });

      // 3. Log transaction in active cashier shift
      if (finalAmt > 0) {
        this.shiftService.recordTransaction({
          type: 'classroom',
          amount: finalAmt,
          paymentMethod: this.checkoutPaymentMethod(),
          details: `تسوية خروج قاعة ${currentCard.name} (${currentCard.instructor})${isPkg ? ` [مخصوم ${coveredHours} س من الباقة]` : ''}`
        });
      }
    }
    this.closeCheckoutModal();
  }

  // ============================================================
  // SUB-MODAL 1: CATERING
  // ============================================================
  openCateringModal(): void {
    const card = this.activeCheckoutCard();
    this.cateringTargetRoom.set({
      id: card?.id || '',
      name: card?.name || 'القاعة',
      instructor: card?.instructor,
      currentCatering: this.checkoutCateringAmount(),
      items: card?.cateringItems || []
    });
    this.isCateringPosModalOpen.set(true);
  }

  closeCateringModal(): void {
    this.isCateringPosModalOpen.set(false);
  }

  incrementProduct(productId: string): void {
    this.cateringProducts.update(products =>
      products.map(p => (p.id === productId ? { ...p, count: p.count + 1 } : p))
    );
    this.syncCateringTotalFromProducts();
  }

  decrementProduct(productId: string): void {
    this.cateringProducts.update(products =>
      products.map(p => (p.id === productId && p.count > 0 ? { ...p, count: p.count - 1 } : p))
    );
    this.syncCateringTotalFromProducts();
  }

  syncCateringTotalFromProducts(): void {
    const productsSum = this.cateringProducts().reduce((sum, p) => sum + p.price * p.count, 0);
    this.checkoutCateringAmount.set(productsSum);
  }

  saveCustomCateringAmount(): void {
    const amount = Number(this.customCateringInput()) || 0;
    this.checkoutCateringAmount.set(amount);
    this.closeCateringModal();
  }

  // ============================================================
  // SUB-MODAL 2: PRINTING
  // ============================================================
  openPrintingModal(): void {
    this.customPrintingInput.set(null);
    this.isPrintingModalOpen.set(true);
  }

  closePrintingModal(): void {
    this.isPrintingModalOpen.set(false);
  }

  calcAndApplyPrintingPages(): void {
    const total = (Number(this.printingNumPages()) || 0) * (Number(this.printingPagePrice()) || 0);
    this.checkoutPrintingAmount.set(Number(total.toFixed(2)));
    this.closePrintingModal();
  }

  saveCustomPrintingAmount(): void {
    const amount = Number(this.customPrintingInput()) || 0;
    this.checkoutPrintingAmount.set(amount);
    this.closePrintingModal();
  }

  // ============================================================
  // SUB-MODAL 3: RATE & DURATION
  // ============================================================
  openRateModal(): void {
    this.customRateInput.set(this.checkoutRoomRate());
    this.customDurationInput.set(this.checkoutDurationHours());
    this.isRateModalOpen.set(true);
  }

  closeRateModal(): void {
    this.isRateModalOpen.set(false);
  }

  saveRateAndDuration(): void {
    this.checkoutRoomRate.set(Math.max(0, Number(this.customRateInput()) || 0));
    this.checkoutDurationHours.set(Math.max(1, Number(this.customDurationInput()) || 1));
    this.closeRateModal();
  }

  adjustCustomRate(delta: number): void {
    this.customRateInput.update(r => Math.max(0, r + delta));
  }

  adjustCustomDuration(delta: number): void {
    this.customDurationInput.update(d => Math.max(1, d + delta));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isCateringModalOpen()) {
      this.closeCateringModal();
      return;
    }
    if (this.isPrintingModalOpen()) {
      this.closePrintingModal();
      return;
    }
    if (this.isRateModalOpen()) {
      this.closeRateModal();
      return;
    }
    if (this.isBookingModalOpen()) this.closeBookingModal();
    if (this.isCheckoutModalOpen()) this.closeCheckoutModal();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.instructor-autocomplete-wrap')) {
      this.isInstructorDropdownOpen.set(false);
    }
  }
}
