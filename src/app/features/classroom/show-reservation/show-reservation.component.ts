import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { ClassroomService } from '../../../core/services/classroom.service';
import { AdminReservation, ClassroomCard } from '../../../core/models/classroom.model';

@Component({
  selector: 'app-show-reservation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './show-reservation.component.html',
  styleUrl: './show-reservation.component.css'
})
export class ShowReservationComponent implements OnInit {
  private langService = inject(LanguageService);
  private classroomService = inject(ClassroomService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  reservationId = signal<string | null>(null);
  selectedReservation = signal<AdminReservation | null>(null);

  getRoomCapacity(roomName?: string): number | string {
    if (!roomName) return '-';
    const room = this.classroomService.rooms().find(r => r.name.toLowerCase() === roomName.toLowerCase());
    return room?.capacity || room?.maxCapacity || '-';
  }

  ngOnInit(): void {
    const idFromParam = this.route.snapshot.paramMap.get('id');
    const idFromQuery = this.route.snapshot.queryParamMap.get('id');
    const id = idFromParam || idFromQuery;

    this.reservationId.set(id);

    if (id) {
      const card = this.classroomService.getCardById(id);
      if (card) {
        this.selectedReservation.set(this.mapCardToReservation(card));
        return;
      }
      const res = this.classroomService.reservations().find(r => r.id === id);
      if (res) {
        this.selectedReservation.set(res);
        return;
      }
    }

    // Fallback to first available non-empty booking card if no id
    const firstCard = this.classroomService.cards().find(c => c.status !== 'available') || this.classroomService.cards()[0];
    if (firstCard) {
      this.selectedReservation.set(this.mapCardToReservation(firstCard));
    }
  }

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

  private mapCardToReservation(card: ClassroomCard): AdminReservation {
    const startTime24 = this.convert12hTo24h(card.startTime);
    const endTime24 = this.convert12hTo24h(card.endTime);

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

  onCheckout(): void {
    const res = this.selectedReservation();
    if (res) {
      this.router.navigate(['/classroom/show-classroom'], {
        queryParams: { checkout: res.id }
      });
    }
  }

  onEdit(): void {
    const res = this.selectedReservation();
    if (res) {
      this.router.navigate(['/classroom/show-classroom'], {
        queryParams: { edit: res.id }
      });
    }
  }
}
