<<<<<<< HEAD
import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PricingPlanApiService } from './api/pricing-plan-api.service';
import { PricingPlanDto } from '../models/pricing-plan.model';
import { PricingScope } from '../api-enums';
=======
import { Injectable, signal, computed } from '@angular/core';
>>>>>>> fix/audit-remediation

export interface RoomPriceEntity {
  id?: string;
  name?: string;
<<<<<<< HEAD
}

/**
 * Unified Room Pricing Service (NOOK-DEV-04, O-3, Step 2.1).
 * Single Source of Truth for room pricing via backend PricingPlans.
 * Uses /api/PricingPlans/suggestion as the primary calculation authority.
 * Never stores or invents hourlyPrice on Room entities.
=======
  hourlyRate?: number;
  hourlyPrice?: number;
}

/**
 * Unified Room Pricing Service (NOOK-DEV-04, O-3).
 * Single Source of Truth for resolving and enforcing room hourly prices.
 * Eradicates inconsistent price sources and eliminates hardcoded fallbacks (40 EGP).
>>>>>>> fix/audit-remediation
 */
@Injectable({
  providedIn: 'root'
})
export class RoomPricingService {
<<<<<<< HEAD
  private pricingPlanApi = inject(PricingPlanApiService);

  private plansState = signal<PricingPlanDto[]>([]);
  readonly activePlans = computed(() => this.plansState().filter(p => p.isActive !== false));
  readonly configuredPlansCount = computed(() => this.activePlans().length);

  /**
   * Synchronize active pricing plans from backend.
   */
  public syncPlans(plans: PricingPlanDto[]): void {
    this.plansState.set(plans || []);
  }

  /**
   * Check if a room has an active pricing plan for the requested scope.
   * Default scope: Classroom (2).
   */
  public hasActivePlanForScope(roomId?: string | null, scope: PricingScope | number = PricingScope.Classroom): boolean {
    if (!roomId) return false;
    const cleanId = roomId.trim().toLowerCase();
    return this.activePlans().some(p =>
      p.roomId && p.roomId.trim().toLowerCase() === cleanId && Number(p.scope) === Number(scope)
    );
  }

  /**
   * Get the active pricing plan for a room and scope.
   */
  public getPlanForRoom(roomId?: string | null, scope: PricingScope | number = PricingScope.Classroom): PricingPlanDto | undefined {
    if (!roomId) return undefined;
    const cleanId = roomId.trim().toLowerCase();
    return this.activePlans().find(p =>
      p.roomId && p.roomId.trim().toLowerCase() === cleanId && Number(p.scope) === Number(scope)
    );
  }

  /**
   * Calculate total suggested cost using the server's formula as single source of truth.
   * Calls GET /api/PricingPlans/suggestion?roomId&scope&hours.
   */
  public getSuggestedCost(roomId: string, hours: number, scope: PricingScope | number = PricingScope.Classroom): Observable<number> {
    if (!roomId || hours <= 0) return of(0);

    return this.pricingPlanApi.getPricingSuggestion(roomId, Number(scope), hours).pipe(
      map(dto => {
        if (dto && typeof dto.suggestedCost === 'number') {
          return dto.suggestedCost;
        }
        if (dto && typeof dto.suggestedTotal === 'number') {
          return dto.suggestedTotal;
        }
        return this.calculateLocalFallback(roomId, hours, scope);
      }),
      catchError(err => {
        console.warn(`[RoomPricingService] Failed to get server suggestion for room ${roomId}:`, err?.message || err);
        return of(this.calculateLocalFallback(roomId, hours, scope));
      })
    );
  }

  /**
   * Local fallback calculation derived from active plan bounds (used only when offline).
   */
  private calculateLocalFallback(roomId: string, hours: number, scope: PricingScope | number): number {
    const plan = this.getPlanForRoom(roomId, scope);
    if (!plan) return 0;

    const baseHours = plan.baseHours || 1;
    const baseCost = plan.baseCost || 0;
    const overageRate = plan.overageHourlyRate || (baseCost / baseHours) || 0;

    if (hours <= baseHours) {
      return baseCost;
    }
    const extra = hours - baseHours;
    return baseCost + (extra * overageRate);
  }

  /**
   * Resolve derived effective hourly rate for display purposes only.
   * Shows overage hourly rate or base rate per hour. Never stored on Room.
   */
  public getRoomHourlyRate(roomOrId?: string | RoomPriceEntity | null, scope: PricingScope | number = PricingScope.Classroom): number {
    if (!roomOrId) return 0;
    const id = typeof roomOrId === 'string' ? roomOrId : roomOrId.id;
    if (!id) return 0;

    const plan = this.getPlanForRoom(id, scope);
    if (!plan) return 0;

    return plan.overageHourlyRate > 0
      ? plan.overageHourlyRate
      : (plan.baseHours > 0 ? +(plan.baseCost / plan.baseHours).toFixed(2) : plan.baseCost);
  }

  /**
   * Get derived hourly rate string for UI labels (e.g. "30 ج.م/ساعة").
   */
  public getDerivedHourlyRateDisplay(roomId?: string | null, isAr = true, scope: PricingScope | number = PricingScope.Classroom): string {
    const rate = this.getRoomHourlyRate(roomId, scope);
    if (rate > 0) {
      return isAr ? `${rate} ج.م/ساعة` : `${rate} EGP/hr`;
    }
    return isAr ? 'غير محدد (يرجى ضبط خطة التسعير)' : 'Unconfigured (Plan required)';
  }

  /**
   * Check if room has a valid configured price (> 0) from an active plan.
   */
  public isRoomPriceConfigured(roomId?: string | null, scope: PricingScope | number = PricingScope.Classroom): boolean {
    return this.hasActivePlanForScope(roomId, scope);
  }

  /**
   * Backward-compatibility helper for legacy sync calls.
   */
  public syncPrices(rooms: any[], plans: any[]): void {
    this.syncPlans(plans || []);
=======
  private roomPricesState = signal<Map<string, number>>(new Map());
  private roomNamePricesState = signal<Map<string, number>>(new Map());

  readonly configuredPricesCount = computed(() => this.roomPricesState().size);

  /**
   * Synchronize room prices from backend Rooms and PricingPlans.
   */
  public syncPrices(rooms: any[], plans: any[]): void {
    const mapById = new Map<string, number>();
    const mapByName = new Map<string, number>();

    for (const r of rooms || []) {
      const id = (r.id || '').trim().toLowerCase();
      const name = (r.name || '').trim().toLowerCase();

      // 1. Direct DTO property
      let rate = Number(r.hourlyPrice || r.hourlyRate) || 0;

      // 2. Matching PricingPlan
      if (rate <= 0 && plans && plans.length > 0) {
        const matchedPlan = plans.find(p =>
          (p.roomId && p.roomId.trim().toLowerCase() === id) ||
          (p.scope === 2 && p.roomId === r.id)
        );
        if (matchedPlan) {
          rate = Number(matchedPlan.baseCost || matchedPlan.overageHourlyRate) || 0;
        }
      }

      if (id && rate > 0) {
        mapById.set(id, rate);
      }
      if (name && rate > 0) {
        mapByName.set(name, rate);
      }
    }

    this.roomPricesState.set(mapById);
    this.roomNamePricesState.set(mapByName);
  }

  /**
   * Resolve effective hourly rate for a room. Never falls back to hardcoded 40 EGP.
   */
  public getRoomHourlyRate(roomOrId?: string | RoomPriceEntity | null): number {
    if (!roomOrId) return 0;

    if (typeof roomOrId === 'object') {
      if (roomOrId.hourlyRate && roomOrId.hourlyRate > 0) return roomOrId.hourlyRate;
      if (roomOrId.hourlyPrice && roomOrId.hourlyPrice > 0) return roomOrId.hourlyPrice;
      const byId = roomOrId.id ? this.getRoomHourlyRate(roomOrId.id) : 0;
      if (byId > 0) return byId;
      if (roomOrId.name) {
        const byName = this.roomNamePricesState().get(roomOrId.name.trim().toLowerCase());
        if (byName && byName > 0) return byName;
      }
      return 0;
    }

    const clean = roomOrId.trim().toLowerCase();
    const byId = this.roomPricesState().get(clean);
    if (byId !== undefined && byId > 0) return byId;

    const byName = this.roomNamePricesState().get(clean);
    if (byName !== undefined && byName > 0) return byName;

    return 0;
  }

  /**
   * Check if a room has a valid configured price (> 0).
   */
  public isRoomPriceConfigured(roomOrId?: string | RoomPriceEntity | null): boolean {
    return this.getRoomHourlyRate(roomOrId) > 0;
  }

  /**
   * Explicitly set/override an hourly price for a room (persists across room switching).
   */
  public setRoomHourlyRate(roomId: string, roomName: string, rate: number): void {
    if (rate <= 0) return;
    const id = (roomId || '').trim().toLowerCase();
    const name = (roomName || '').trim().toLowerCase();

    this.roomPricesState.update(m => {
      const next = new Map(m);
      if (id) next.set(id, rate);
      return next;
    });

    this.roomNamePricesState.update(m => {
      const next = new Map(m);
      if (name) next.set(name, rate);
      return next;
    });
>>>>>>> fix/audit-remediation
  }
}
