import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';
import { ClassroomService } from '../../../core/services/classroom.service';
import { ClassroomCard, SelectableRoom } from '../../../core/models/classroom.model';

@Component({
  selector: 'app-add-classroom',
  imports: [RouterLink, FormsModule],
  templateUrl: './add-classroom.component.html',
  styleUrl: './add-classroom.component.css'
})
export class AddClassroomComponent {
  private langService = inject(LanguageService);
  private classroomService = inject(ClassroomService);
  private router = inject(Router);

  t = this.langService.t;
  isArabic = this.langService.isArabic;
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

  // Form Fields
  instructor = signal('');
  activitySubject = signal('');
  phoneNumber = signal('');
  emailAddress = signal('');

  // Validation Signals
  isInstructorValid = computed(() => {
    const val = this.instructor().trim();
    return val.length >= 3 && val.length <= 50;
  });

  isActivityValid = computed(() => {
    const val = this.activitySubject().trim();
    return val.length >= 3 && val.length <= 60;
  });

  isPhoneValid = computed(() => {
    const val = this.phoneNumber().trim();
    if (!val) return true; // Optional field
    return val.length === 11;
  });

  isEmailValid = computed(() => {
    const val = this.emailAddress().trim();
    if (!val) return true; // Optional field
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return val.length <= 80 && regex.test(val);
  });

  onInstructorInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[^a-zA-Z\s\u0600-\u06FF.]/g, '').substring(0, 50);
    input.value = cleaned;
    this.instructor.set(cleaned);
  }

  onActivityInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[^a-zA-Z0-9\s\u0600-\u06FF().,-]/g, '').substring(0, 60);
    input.value = cleaned;
    this.activitySubject.set(cleaned);
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/\D/g, '').substring(0, 11);
    input.value = cleaned;
    this.phoneNumber.set(cleaned);
  }

  onEmailInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.substring(0, 80);
    input.value = cleaned;
    this.emailAddress.set(cleaned);
  }

  hourlyRate = signal<number>(0);
  printingCharges = signal<number>(0);
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

  startTime = computed(() => {
    if (!this.startHour()) return '';
    const h = this.startHour().padStart(2, '0');
    const m = (this.startMinute() || '00').padStart(2, '0');
    return `${h}:${m} ${this.startPeriod()}`;
  });

  endTime = computed(() => {
    if (!this.endHour()) return '';
    const h = this.endHour().padStart(2, '0');
    const m = (this.endMinute() || '00').padStart(2, '0');
    return `${h}:${m} ${this.endPeriod()}`;
  });

  // Rooms
  rooms = this.classroomService.rooms;
  selectedRoomId = signal<string>('nook-1');

  // Discount Toggle
  isDiscountApplied = signal(false);
  discountRate = signal(0.10);

  isTimeRangeValid = computed(() => {
    if (!this.startTime() || !this.endTime()) return true;
    const startMins = this.classroomService.parseTimeToMinutes(this.startTime());
    const endMins = this.classroomService.parseTimeToMinutes(this.endTime());
    return endMins > startMins;
  });

  // Calculations
  durationHours = computed(() => {
    if (this.startTime() && this.endTime() && this.isTimeRangeValid()) {
      const startMins = this.classroomService.parseTimeToMinutes(this.startTime());
      const endMins = this.classroomService.parseTimeToMinutes(this.endTime());
      const diff = endMins - startMins;
      return diff > 0 ? Number((diff / 60).toFixed(1)) : 0;
    }
    return 0;
  });

  roomRentalTotal = computed(() => {
    return this.hourlyRate() * this.durationHours();
  });

  subtotal = computed(() => {
    return this.roomRentalTotal() + Number(this.printingCharges() || 0);
  });

  discountAmount = computed(() => {
    if (!this.isDiscountApplied()) return 0;
    return this.subtotal() * this.discountRate();
  });

  total = computed(() => {
    return Math.max(0, this.subtotal() - this.discountAmount());
  });

  selectRoom(roomId: string): void {
    this.selectedRoomId.set(roomId);
    const room = this.rooms().find(r => r.id === roomId);
    if (room) {
      this.hourlyRate.set(room.hourlyRate);
    }
  }

  toggleDiscount(): void {
    this.isDiscountApplied.update(val => !val);
  }

  clearInstructor(): void {
    this.instructor.set('');
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

  allCards = this.classroomService.cards;

  hasBookingOverlap = computed(() => {
    if (!this.startTime() || !this.endTime() || !this.bookingDate()) return false;

    const selectedRoom = this.rooms().find(r => r.id === this.selectedRoomId());
    if (!selectedRoom) return false;

    const proposedRoomName = selectedRoom.name.toLowerCase();
    const proposedDate = this.bookingDate();
    const proposedStart = this.startTime();
    const proposedEnd = this.endTime();

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

    return this.allCards().some(card => {
      if (card.status === 'available' || card.status === 'cancelled') return false;
      if (card.name.toLowerCase() !== proposedRoomName) return false;
      if (!card.startTime || !card.endTime || !card.bookingDate) return false;

      const cardSegments = getSegments(card.bookingDate, card.startTime, card.endTime);

      return proposedSegments.some(pSeg =>
        cardSegments.some(cSeg =>
          pSeg.date === cSeg.date && pSeg.start < cSeg.end && pSeg.end > cSeg.start
        )
      );
    });
  });

  isFormValid = computed(() => {
    const hasInstructor = !!this.instructor().trim() && this.isInstructorValid();
    const hasActivity = !!this.activitySubject().trim() && this.isActivityValid();
    const hasDate = !!this.bookingDate().trim() && this.isDateValid();
    const hasHourlyRate = Number(this.hourlyRate()) > 0;
    const hasTimes = !!this.startTime() && !!this.endTime();
    const validRange = this.isTimeRangeValid() && this.durationHours() > 0;
    const noOverlap = !this.hasBookingOverlap();
    const validPhone = this.isPhoneValid();
    const validEmail = this.isEmailValid();
    return hasInstructor && hasActivity && hasDate && hasHourlyRate && hasTimes && validRange && noOverlap && validPhone && validEmail;
  });

  onSubmit(): void {
    this.saveClassroomBooking();
  }

  saveClassroomBooking(): void {
    if (!this.isFormValid()) return;

    const selectedRoom = this.rooms().find(r => r.id === this.selectedRoomId()) || this.rooms()[0];
    const duration = this.durationHours();
    const isOngoing = this.classroomService.isSessionActive(this.startTime(), this.endTime(), this.bookingDate());
    const cardStatus = isOngoing ? 'active' : 'scheduled';
    const initialElapsed = isOngoing
      ? this.classroomService.calculateElapsed(this.startTime(), this.bookingDate())
      : `${duration}h session`;

    const newCard: ClassroomCard = {
      id: 'room-' + Date.now(),
      name: selectedRoom?.name || '',
      activity: this.activitySubject(),
      instructor: this.instructor(),
      email: this.emailAddress(),
      phone: this.phoneNumber(),
      status: cardStatus,
      image: selectedRoom?.image || '',
      colorTheme: selectedRoom?.colorTheme || 'blue',
      accentColor: selectedRoom?.accentColor || '#2563eb',
      hourlyRate: this.hourlyRate(),
      printingCharges: Number(this.printingCharges() || 0),
      startTime: this.startTime(),
      endTime: this.endTime(),
      bookingDate: this.bookingDate(),
      durationHours: duration,
      elapsed: initialElapsed,
      rental: this.roomRentalTotal(),
      catering: 0
    };

    this.classroomService.addBooking(newCard);
    this.router.navigate(['/classroom/show-classroom']);
  }
}
