import { Injectable, signal, computed, inject } from '@angular/core';
import { catchError, of, forkJoin, finalize, Observable, map, switchMap } from 'rxjs';
import { RoomApiService } from './api/room-api.service';
import { PricingPlanApiService } from './api/pricing-plan-api.service';
import { PackagePricingPlanApiService } from './api/package-pricing-plan-api.service';
import { AuthService } from './auth.service';
import { RoomDto } from '../models/classroom-session.model';
import { PricingPlanDto, PackagePricingPlanDto, PackageType } from '../models/pricing-plan.model';
import { resolveImageUrl } from '../utils/image-url.util';

export interface StudentPricingTier {
  id: string;
  roomId?: string;
  roomName?: string | null;
  fromHours: number;
  toHours: number;
  priceEgp: number;
  labelAr?: string;
  labelEn?: string;
}

export interface RoomEntity {
  id: string;
  name: string;
  nameEn?: string;
  type: 'Classroom' | 'Silent Zone' | 'Shared Space';
  capacity: number;
  hourlyPrice: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface QuickPackagePreset {
  id: string;
  packageType: 'student' | 'instructor';
  hours: number;
  price: number;
  validityDays: number;
  nameAr?: string;
  nameEn?: string;
}

export interface SystemSettingsState {
  pricingTiers: StudentPricingTier[];
  rooms: RoomEntity[];
  packagePresets: QuickPackagePreset[];
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private roomApi = inject(RoomApiService);
  private pricingPlanApi = inject(PricingPlanApiService);
  private packagePricingPlanApi = inject(PackagePricingPlanApiService);
  private authService = inject(AuthService);

  // Pure In-Memory State (Signals only - ZERO localStorage)
  private settingsState = signal<SystemSettingsState>({
    pricingTiers: [],
    rooms: [],
    packagePresets: []
  });

  // Loading and Error Signals
  readonly isLoading = signal<boolean>(false);
  readonly isLoadingPricing = signal<boolean>(false);
  readonly isLoadingRooms = signal<boolean>(false);
  readonly isLoadingPackages = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly pricingTiers = computed(() => this.settingsState().pricingTiers);
  readonly rooms = computed(() => this.settingsState().rooms);
  readonly packagePresets = computed(() => this.settingsState().packagePresets);
  readonly studentPackagePresets = computed(() => this.settingsState().packagePresets.filter(p => p.packageType !== 'instructor'));
  readonly instructorPackagePresets = computed(() => this.settingsState().packagePresets.filter(p => p.packageType === 'instructor'));

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.syncAllSettingsFromBackend();
    }
  }

  /**
   * Synchronize all settings from backend APIs in parallel
   */
  public syncAllSettingsFromBackend(): void {
    if (!this.authService.isAuthenticated()) return;

    this.isLoading.set(true);
    this.isLoadingPricing.set(true);
    this.isLoadingRooms.set(true);
    this.isLoadingPackages.set(true);
    this.error.set(null);

    forkJoin({
      rooms: this.roomApi.getRooms().pipe(catchError(() => of([] as RoomDto[]))),
      plans: this.pricingPlanApi.getPricingPlans().pipe(catchError(() => of([] as PricingPlanDto[]))),
      packages: this.packagePricingPlanApi.getPackagePricingPlans().pipe(catchError(() => of([] as PackagePricingPlanDto[])))
    })
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
          this.isLoadingPricing.set(false);
          this.isLoadingRooms.set(false);
          this.isLoadingPackages.set(false);
        })
      )
      .subscribe({
        next: ({ rooms, plans, packages }) => {
          // Map Rooms
          const mappedRooms: RoomEntity[] = (rooms || []).map(r => ({
            id: r.id,
            name: r.name,
            nameEn: r.nameEn || r.name,
            type: r.supportsClassroom ? 'Classroom' : (r.workspaceZone === 2 ? 'Silent Zone' : 'Shared Space'),
            capacity: r.capacity || 0,
            hourlyPrice: r.hourlyPrice || 0,
            imageUrl: resolveImageUrl(r.imageUrl),
            isActive: r.isActive !== false
          }));

          // Map Pricing Plans (Tiers)
          const sortedPlans = [...(plans || [])].sort((a, b) => a.baseHours - b.baseHours);
          let prevTo = 0;
          const mappedTiers: StudentPricingTier[] = sortedPlans.map(p => {
            const from = prevTo;
            const to = p.baseHours;
            prevTo = to;
            return {
              id: p.id,
              roomId: p.roomId,
              roomName: p.roomName,
              fromHours: from,
              toHours: to,
              priceEgp: p.baseCost,
              labelAr: `${from} - ${to} ساعة`,
              labelEn: `${from} - ${to} hrs`
            };
          });

          // Map Package Presets
          const mappedPackages: QuickPackagePreset[] = (packages || []).map(pkg => ({
            id: pkg.id,
            packageType: (pkg.packageType === 2 || pkg.packageType === PackageType.Classroom) ? 'instructor' : 'student',
            hours: pkg.hours,
            price: pkg.price,
            validityDays: pkg.validityDays || 30,
            nameAr: pkg.name,
            nameEn: pkg.name
          }));

          this.settingsState.set({
            rooms: mappedRooms,
            pricingTiers: mappedTiers,
            packagePresets: mappedPackages
          });
        },
        error: () => {
          this.error.set('فشل في تحميل إعدادات النظام من السيرفر');
        }
      });
  }

  // --- 1. Sync Rooms from Backend ---
  public syncRoomsFromBackend(): void {
    if (!this.authService.isAuthenticated()) return;
    this.isLoadingRooms.set(true);
    this.roomApi.getRooms().pipe(
      catchError(() => of([] as RoomDto[])),
      finalize(() => this.isLoadingRooms.set(false))
    ).subscribe({
      next: (backendRooms) => {
        const mapped: RoomEntity[] = (backendRooms || []).map(r => ({
          id: r.id,
          name: r.name,
          nameEn: r.nameEn || r.name,
          type: r.supportsClassroom ? 'Classroom' : (r.workspaceZone === 2 ? 'Silent Zone' : 'Shared Space'),
          capacity: r.capacity || 0,
          hourlyPrice: r.hourlyPrice || 0,
          imageUrl: resolveImageUrl(r.imageUrl),
          isActive: r.isActive !== false
        }));
        this.settingsState.update(s => ({ ...s, rooms: mapped }));
      }
    });
  }

  // --- 2. Sync Pricing Plans (Tiers) from Backend ---
  public syncPricingPlansFromBackend(): void {
    if (!this.authService.isAuthenticated()) return;
    this.isLoadingPricing.set(true);
    this.pricingPlanApi.getPricingPlans().pipe(
      catchError(() => of([] as PricingPlanDto[])),
      finalize(() => this.isLoadingPricing.set(false))
    ).subscribe({
      next: (plans) => {
        const sorted = [...(plans || [])].sort((a, b) => a.baseHours - b.baseHours);
        let prevTo = 0;
        const mapped: StudentPricingTier[] = sorted.map(p => {
          const from = prevTo;
          const to = p.baseHours;
          prevTo = to;
          return {
            id: p.id,
            roomId: p.roomId,
            roomName: p.roomName,
            fromHours: from,
            toHours: to,
            priceEgp: p.baseCost,
            labelAr: `${from} - ${to} ساعة`,
            labelEn: `${from} - ${to} hrs`
          };
        });
        this.settingsState.update(s => ({ ...s, pricingTiers: mapped }));
      }
    });
  }

  // --- 3. Sync Package Pricing Plans (Presets) from Backend ---
  public syncPackagePricingPlansFromBackend(): void {
    if (!this.authService.isAuthenticated()) return;
    this.isLoadingPackages.set(true);
    this.packagePricingPlanApi.getPackagePricingPlans().pipe(
      catchError(() => of([] as PackagePricingPlanDto[])),
      finalize(() => this.isLoadingPackages.set(false))
    ).subscribe({
      next: (packages) => {
        const mapped: QuickPackagePreset[] = (packages || []).map(pkg => ({
          id: pkg.id,
          packageType: (pkg.packageType === 2 || pkg.packageType === PackageType.Classroom) ? 'instructor' : 'student',
          hours: pkg.hours,
          price: pkg.price,
          validityDays: pkg.validityDays || 30,
          nameAr: pkg.name,
          nameEn: pkg.name
        }));
        this.settingsState.update(s => ({ ...s, packagePresets: mapped }));
      }
    });
  }

  // Calculate Student Cost based on Duration Hours & Settings Tiers
  calculateStudentCost(durationHours: number): number {
    if (!durationHours || durationHours <= 0) return 0;

    const tiers = [...this.pricingTiers()].sort((a, b) => a.fromHours - b.fromHours);
    if (tiers.length > 0) {
      for (const tier of tiers) {
        if (durationHours >= tier.fromHours && durationHours <= tier.toHours) {
          return tier.priceEgp;
        }
      }
      const highest = tiers[tiers.length - 1];
      if (durationHours > highest.toHours) {
        const extraHours = Math.ceil(durationHours - highest.toHours);
        const overageRate = 15; // standard rate for extra hours
        return highest.priceEgp + (extraHours * overageRate);
      }
      return highest.priceEgp;
    }

    // Standard default rate if no tiers configured
    return Math.max(20, Math.ceil(durationHours) * 20);
  }

  // --- Pricing Tiers CRUD (Live Backend API) ---
  addPricingTier(tier: Omit<StudentPricingTier, 'id'>): void {
    // If a specific roomId was provided, use it
    if (tier.roomId) {
      this.executeCreatePricingPlan(tier.roomId, tier);
      return;
    }

    // Otherwise, find existing room or fallback to first room
    const handleRoomResolution = (roomId?: string) => {
      if (roomId) {
        this.executeCreatePricingPlan(roomId, tier);
        return;
      }
      this.roomApi.getRooms().subscribe({
        next: (rooms) => {
          if (rooms && rooms.length > 0) {
            this.executeCreatePricingPlan(rooms[0].id, tier);
          } else {
            this.roomApi.createRoom({
              name: 'المساحة العامة',
              supportsWorkspace: true,
              supportsClassroom: false,
              workspaceZone: 1,
              isActive: true
            }).subscribe({
              next: (createdRoom) => {
                if (createdRoom && createdRoom.id) {
                  this.syncRoomsFromBackend();
                  this.executeCreatePricingPlan(createdRoom.id, tier);
                }
              }
            });
          }
        }
      });
    };

    handleRoomResolution(tier.roomId);
  }

  private executeCreatePricingPlan(roomId: string, tier: Omit<StudentPricingTier, 'id'>): void {
    this.pricingPlanApi.createPricingPlan({
      roomId,
      scope: 0,
      baseHours: tier.toHours,
      baseCost: tier.priceEgp,
      overageHourlyRate: 15,
      isActive: true,
      note: tier.labelAr || tier.labelEn
    }).subscribe({
      next: (created) => {
        if (created && created.id) {
          const newTier: StudentPricingTier = {
            id: created.id,
            roomId: created.roomId,
            roomName: created.roomName,
            fromHours: tier.fromHours,
            toHours: tier.toHours,
            priceEgp: created.baseCost || tier.priceEgp,
            labelAr: created.note || tier.labelAr,
            labelEn: created.note || tier.labelEn
          };
          const updated = [...this.pricingTiers(), newTier].sort((a, b) => a.fromHours - b.fromHours);
          this.settingsState.update(s => ({ ...s, pricingTiers: updated }));
        }
      }
    });
  }

  updatePricingTier(tier: StudentPricingTier): void {
    this.pricingPlanApi.updatePricingPlan(tier.id, {
      baseHours: tier.toHours,
      baseCost: tier.priceEgp,
      overageHourlyRate: 15,
      isActive: true,
      note: tier.labelAr || tier.labelEn
    }).subscribe({
      next: () => {
        const updated = this.pricingTiers().map(t => (t.id === tier.id ? tier : t)).sort((a, b) => a.fromHours - b.fromHours);
        this.settingsState.update(s => ({ ...s, pricingTiers: updated }));
      }
    });
  }

  deletePricingTier(id: string): void {
    this.pricingPlanApi.deletePricingPlan(id).subscribe({
      next: () => {
        const updated = this.pricingTiers().filter(t => t.id !== id);
        this.settingsState.update(s => ({ ...s, pricingTiers: updated }));
      }
    });
  }

  // --- Rooms CRUD (Live Backend API) ---
  addRoom(room: Omit<RoomEntity, 'id'>, imageFile?: File): Observable<RoomEntity> {
    const isAbsoluteUrl = room.imageUrl && (room.imageUrl.startsWith('http://') || room.imageUrl.startsWith('https://'));
    const isClassroom = room.type === 'Classroom';
    const zone = isClassroom ? undefined : (room.type === 'Silent Zone' ? 2 : 1);

    return this.roomApi.createRoom({
      name: room.name,
      supportsWorkspace: !isClassroom,
      supportsClassroom: isClassroom,
      workspaceZone: zone,
      description: room.name,
      isActive: room.isActive,
      imageUrl: isAbsoluteUrl ? room.imageUrl : undefined,
      imageFile: imageFile
    }).pipe(
      switchMap(created => {
        if (imageFile && created && created.id) {
          return this.roomApi.uploadRoomImage(created.id, imageFile).pipe(
            map(imgDto => {
              if (imgDto && imgDto.imageUrl) {
                created.imageUrl = imgDto.imageUrl;
              }
              return created;
            }),
            catchError(err => {
              console.warn('[SettingsService] uploadRoomImage error:', err);
              return of(created);
            })
          );
        }
        return of(created);
      }),
      map((created) => {
        const newRoom: RoomEntity = {
          id: created.id,
          name: created.name,
          nameEn: created.nameEn || created.name,
          type: created.supportsClassroom ? 'Classroom' : (created.workspaceZone === 2 ? 'Silent Zone' : 'Shared Space'),
          capacity: room.capacity || 0,
          hourlyPrice: room.hourlyPrice || 0,
          imageUrl: resolveImageUrl(created.imageUrl),
          isActive: created.isActive !== false
        };
        this.settingsState.update(s => ({ ...s, rooms: [newRoom, ...s.rooms.filter(r => r.id !== created.id)] }));
        return newRoom;
      })
    );
  }

  updateRoom(room: RoomEntity, imageFile?: File): Observable<RoomEntity> {
    const isAbsoluteUrl = room.imageUrl && (room.imageUrl.startsWith('http://') || room.imageUrl.startsWith('https://'));
    const isClassroom = room.type === 'Classroom';
    const zone = isClassroom ? undefined : (room.type === 'Silent Zone' ? 2 : 1);

    return this.roomApi.updateRoom(room.id, {
      name: room.name,
      supportsWorkspace: !isClassroom,
      supportsClassroom: isClassroom,
      workspaceZone: zone,
      description: room.name,
      isActive: room.isActive,
      imageUrl: isAbsoluteUrl ? room.imageUrl : undefined,
      imageFile: imageFile
    }).pipe(
      switchMap(updated => {
        if (imageFile && updated && updated.id) {
          return this.roomApi.uploadRoomImage(updated.id, imageFile).pipe(
            map(imgDto => {
              if (imgDto && imgDto.imageUrl) {
                updated.imageUrl = imgDto.imageUrl;
              }
              return updated;
            }),
            catchError(err => {
              console.warn('[SettingsService] uploadRoomImage error on update:', err);
              return of(updated);
            })
          );
        }
        return of(updated);
      }),
      map((updated) => {
        const updatedRoom: RoomEntity = {
          ...room,
          name: updated.name || room.name,
          nameEn: updated.nameEn || room.nameEn,
          type: updated.supportsClassroom ? 'Classroom' : (updated.workspaceZone === 2 ? 'Silent Zone' : 'Shared Space'),
          capacity: updated.capacity ?? room.capacity,
          hourlyPrice: updated.hourlyPrice ?? room.hourlyPrice,
          imageUrl: resolveImageUrl(updated.imageUrl || (imageFile ? '' : (room.imageUrl?.startsWith('data:') ? '' : room.imageUrl))),
          isActive: updated.isActive !== false
        };
        const updatedList = this.rooms().map(r => (r.id === room.id ? updatedRoom : r));
        this.settingsState.update(s => ({ ...s, rooms: updatedList }));
        return updatedRoom;
      })
    );
  }

  deleteRoom(id: string): void {
    this.roomApi.deleteRoom(id).subscribe({
      next: () => {
        const updated = this.rooms().filter(r => r.id !== id);
        this.settingsState.update(s => ({ ...s, rooms: updated }));
      }
    });
  }

  toggleRoomActive(id: string): void {
    const target = this.rooms().find(r => r.id === id);
    if (!target) return;

    const nextActive = !target.isActive;

    this.roomApi.updateRoom(id, {
      name: target.name,
      capacity: target.capacity || 30,
      supportsWorkspace: target.type !== 'Classroom',
      supportsClassroom: target.type === 'Classroom',
      workspaceZone: target.type === 'Silent Zone' ? 2 : 1,
      description: target.name,
      isActive: nextActive,
      imageUrl: target.imageUrl
    }).subscribe({
      next: () => {
        const updated = this.rooms().map(r => (r.id === id ? { ...r, isActive: nextActive } : r));
        this.settingsState.update(s => ({ ...s, rooms: updated }));
      }
    });
  }

  // --- Quick Package Presets CRUD (Live Backend API) ---
  addPackagePreset(preset: Omit<QuickPackagePreset, 'id'>): void {
    this.packagePricingPlanApi.createPackagePricingPlan({
      name: preset.nameAr || preset.nameEn || `${preset.hours} Hours Package`,
      packageType: preset.packageType === 'instructor' ? PackageType.Classroom : PackageType.Workspace,
      hours: preset.hours,
      price: preset.price,
      validityDays: preset.validityDays,
      isActive: true
    }).subscribe({
      next: (created) => {
        if (created && created.id) {
          const newPreset: QuickPackagePreset = {
            id: created.id,
            packageType: (created.packageType === 2 || created.packageType === PackageType.Classroom) ? 'instructor' : 'student',
            hours: created.hours,
            price: created.price,
            validityDays: created.validityDays || preset.validityDays || 30,
            nameAr: created.name,
            nameEn: created.name
          };
          this.settingsState.update(s => ({ ...s, packagePresets: [...s.packagePresets, newPreset] }));
        }
      }
    });
  }

  updatePackagePreset(preset: QuickPackagePreset): void {
    this.packagePricingPlanApi.updatePackagePricingPlan(preset.id, {
      name: preset.nameAr || preset.nameEn || `${preset.hours} Hours Package`,
      packageType: preset.packageType === 'instructor' ? PackageType.Classroom : PackageType.Workspace,
      hours: preset.hours,
      price: preset.price,
      validityDays: preset.validityDays,
      isActive: true
    }).subscribe({
      next: () => {
        const updated = this.packagePresets().map(p => (p.id === preset.id ? preset : p));
        this.settingsState.update(s => ({ ...s, packagePresets: updated }));
      }
    });
  }

  deletePackagePreset(id: string): void {
    this.packagePricingPlanApi.deletePackagePricingPlan(id).subscribe({
      next: () => {
        const updated = this.packagePresets().filter(p => p.id !== id);
        this.settingsState.update(s => ({ ...s, packagePresets: updated }));
      }
    });
  }
}
