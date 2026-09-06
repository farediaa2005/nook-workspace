import { Injectable, signal, computed, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { RoomApiService } from './api/room-api.service';
import { PricingPlanApiService } from './api/pricing-plan-api.service';
import { PackagePricingPlanApiService } from './api/package-pricing-plan-api.service';
import { AuthService } from './auth.service';
import { RoomDto } from '../models/classroom-session.model';
import { PricingPlanDto, PackagePricingPlanDto, PackageType } from '../models/pricing-plan.model';

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

export const DEFAULT_SYSTEM_TIERS: StudentPricingTier[] = [
  { id: 'tier-1', fromHours: 0, toHours: 1, priceEgp: 20, labelAr: '0 - 1 ساعة', labelEn: '0 - 1 hrs' },
  { id: 'tier-2', fromHours: 1, toHours: 3, priceEgp: 35, labelAr: '1 - 3 ساعات', labelEn: '1 - 3 hrs' },
  { id: 'tier-3', fromHours: 3, toHours: 6, priceEgp: 50, labelAr: '3 - 6 ساعات', labelEn: '3 - 6 hrs' },
  { id: 'tier-4', fromHours: 6, toHours: 12, priceEgp: 80, labelAr: '6 - 12 ساعة', labelEn: '6 - 12 hrs' }
];

export const DEFAULT_SYSTEM_ROOMS: RoomEntity[] = [
  { id: 'room-shared-1', name: 'المساحة العامة', nameEn: 'Shared Space', type: 'Shared Space', capacity: 35, hourlyPrice: 20, imageUrl: '/images/rooms/room-studio.jpg', isActive: true },
  { id: 'room-silent-1', name: 'منطقة الهدوء (سايلنت زون)', nameEn: 'Silent Zone', type: 'Silent Zone', capacity: 15, hourlyPrice: 25, imageUrl: '/images/rooms/room-design.jpg', isActive: true },
  { id: 'room-class-1', name: 'قاعة المحاضرات A', nameEn: 'Classroom A', type: 'Classroom', capacity: 30, hourlyPrice: 150, imageUrl: '/images/rooms/room-workshop.jpg', isActive: true }
];

export interface QuickPackagePreset {
  id: string;
  packageType: 'student' | 'instructor';
  hours: number;
  price: number;
  validityDays: number;
  nameAr?: string;
  nameEn?: string;
}

export const DEFAULT_PACKAGE_PRESETS: QuickPackagePreset[] = [
  { id: 'pkg-1', packageType: 'student', hours: 10, price: 180, validityDays: 30, nameAr: 'باقة 10 ساعات', nameEn: '10 Hours Pass' },
  { id: 'pkg-2', packageType: 'student', hours: 20, price: 320, validityDays: 30, nameAr: 'باقة 20 ساعة', nameEn: '20 Hours Pass' },
  { id: 'pkg-3', packageType: 'student', hours: 50, price: 700, validityDays: 60, nameAr: 'باقة 50 ساعة', nameEn: '50 Hours Pass' },
  { id: 'pkg-4', packageType: 'student', hours: 100, price: 1200, validityDays: 90, nameAr: 'باقة 100 ساعة', nameEn: '100 Hours Pass' },
  { id: 'pkg-5', packageType: 'instructor', hours: 20, price: 1500, validityDays: 30, nameAr: 'باقة محاضر 20 ساعة', nameEn: 'Instructor 20h Pass' },
  { id: 'pkg-6', packageType: 'instructor', hours: 50, price: 3000, validityDays: 60, nameAr: 'باقة محاضر 50 ساعة', nameEn: 'Instructor 50h Pass' }
];

export interface SystemSettingsState {
  pricingTiers: StudentPricingTier[];
  rooms: RoomEntity[];
  packagePresets: QuickPackagePreset[];
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public static readonly STORAGE_KEY = 'nook_system_settings_cache';

  private roomApi = inject(RoomApiService);
  private pricingPlanApi = inject(PricingPlanApiService);
  private packagePricingPlanApi = inject(PackagePricingPlanApiService);
  private authService = inject(AuthService);

  private settingsState = signal<SystemSettingsState>(this.loadSettings());

  readonly pricingTiers = computed(() => this.settingsState().pricingTiers);
  readonly rooms = computed(() => this.settingsState().rooms);
  readonly packagePresets = computed(() => this.settingsState().packagePresets);
  readonly studentPackagePresets = computed(() => this.settingsState().packagePresets.filter(p => p.packageType !== 'instructor'));
  readonly instructorPackagePresets = computed(() => this.settingsState().packagePresets.filter(p => p.packageType === 'instructor'));

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.syncRoomsFromBackend();
      this.syncPricingPlansFromBackend();
      this.syncPackagePricingPlansFromBackend();
    }
  }

  // --- 1. Sync Rooms from Backend ---
  public syncRoomsFromBackend(): void {
    if (!this.authService.isAuthenticated()) return;
    this.roomApi.getRooms().pipe(
      catchError((err) => {
        if (err?.status === 403) {
          console.info('[SettingsService] Rooms API requires elevated role (403 Forbidden). Using cached/system rooms.');
        } else {
          console.warn('[SettingsService] Could not sync rooms from API, using cached data.');
        }
        return of([] as RoomDto[]);
      })
    ).subscribe({
      next: (backendRooms) => {
        if (backendRooms && backendRooms.length > 0) {
          const mapped: RoomEntity[] = backendRooms.map(r => ({
            id: r.id,
            name: r.name,
            nameEn: r.nameEn || r.name,
            type: r.supportsClassroom ? 'Classroom' : (r.workspaceZone === 2 ? 'Silent Zone' : 'Shared Space'),
            capacity: r.capacity || 30,
            hourlyPrice: r.hourlyPrice || 100,
            imageUrl: r.imageUrl || (r.supportsClassroom ? '/images/rooms/room-workshop.jpg' : (r.workspaceZone === 2 ? '/images/rooms/room-design.jpg' : '/images/rooms/room-studio.jpg')),
            isActive: r.isActive !== false
          }));
          this.settingsState.update(s => {
            const next = { ...s, rooms: mapped };
            this.persistToLocalStorage(next);
            return next;
          });
        }
      }
    });
  }

  // --- 2. Sync Pricing Plans (Tiers) from Backend ---
  public syncPricingPlansFromBackend(): void {
    if (!this.authService.isAuthenticated()) return;
    this.pricingPlanApi.getPricingPlans().pipe(
      catchError((err) => {
        if (err?.status === 403) {
          console.info('[SettingsService] PricingPlans API requires elevated role (403 Forbidden). Using cached plans.');
        } else {
          console.warn('[SettingsService] Could not sync pricing plans from API, using cached data.');
        }
        return of([] as PricingPlanDto[]);
      })
    ).subscribe({
      next: (plans) => {
        if (plans && plans.length > 0) {
          const sorted = [...plans].sort((a, b) => a.baseHours - b.baseHours);
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
              labelAr: p.note || `${from} - ${to} ساعة`,
              labelEn: p.note || `${from} - ${to} hrs`
            };
          });
          this.settingsState.update(s => {
            const next = { ...s, pricingTiers: mapped };
            this.persistToLocalStorage(next);
            return next;
          });
        }
      }
    });
  }

  // --- 3. Sync Package Pricing Plans (Presets) from Backend ---
  public syncPackagePricingPlansFromBackend(): void {
    if (!this.authService.isAuthenticated()) return;
    this.packagePricingPlanApi.getPackagePricingPlans().pipe(
      catchError((err) => {
        if (err?.status === 403) {
          console.info('[SettingsService] PackagePricingPlans API requires elevated role (403 Forbidden). Using cached package presets.');
        } else {
          console.warn('[SettingsService] Could not sync package plans from API, using cached data.');
        }
        return of([] as PackagePricingPlanDto[]);
      })
    ).subscribe({
      next: (packages) => {
        if (packages && packages.length > 0) {
          const mapped: QuickPackagePreset[] = packages.map(pkg => ({
            id: pkg.id,
            packageType: (pkg.packageType === 2 || pkg.packageType === PackageType.Classroom) ? 'instructor' : 'student',
            hours: pkg.hours,
            price: pkg.price,
            validityDays: pkg.validityDays || 30,
            nameAr: pkg.name,
            nameEn: pkg.name
          }));
          this.settingsState.update(s => {
            const next = { ...s, packagePresets: mapped };
            this.persistToLocalStorage(next);
            return next;
          });
        }
      }
    });
  }

  private loadSettings(): SystemSettingsState {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(SettingsService.STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            const cleanRooms = Array.isArray(parsed.rooms) && parsed.rooms.length > 0
              ? parsed.rooms.map((r: any) => ({
                  ...r,
                  imageUrl: (r.imageUrl && r.imageUrl.trim())
                    ? r.imageUrl.trim()
                    : (r.type === 'Silent Zone' ? '/images/rooms/room-design.jpg' : (r.type === 'Shared Space' ? '/images/rooms/room-studio.jpg' : '/images/rooms/room-workshop.jpg'))
                }))
              : [...DEFAULT_SYSTEM_ROOMS];
            const cleanPresets: QuickPackagePreset[] = Array.isArray(parsed.packagePresets) && parsed.packagePresets.length > 0
              ? parsed.packagePresets.map((p: any) => ({
                  ...p,
                  packageType: p.packageType === 'instructor' ? 'instructor' : 'student'
                }))
              : [...DEFAULT_PACKAGE_PRESETS];
            const cleanTiers: StudentPricingTier[] = Array.isArray(parsed.pricingTiers) && parsed.pricingTiers.length > 0
              ? parsed.pricingTiers
              : [...DEFAULT_SYSTEM_TIERS];

            return {
              pricingTiers: cleanTiers,
              rooms: cleanRooms,
              packagePresets: cleanPresets
            };
          }
        }
      }
    } catch {}
    return {
      pricingTiers: [...DEFAULT_SYSTEM_TIERS],
      rooms: [...DEFAULT_SYSTEM_ROOMS],
      packagePresets: [...DEFAULT_PACKAGE_PRESETS]
    };
  }

  private saveSettings(nextState: SystemSettingsState): void {
    this.settingsState.set(nextState);
    this.persistToLocalStorage(nextState);
  }

  private persistToLocalStorage(state: SystemSettingsState): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(SettingsService.STORAGE_KEY, JSON.stringify(state));
      }
    } catch {}
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
        return highest.priceEgp + (extraHours * 15);
      }
      return highest.priceEgp;
    }

    return Math.max(20, Math.round(durationHours * 20));
  }

  // --- Pricing Tiers CRUD (Live Backend API) ---
  addPricingTier(tier: Omit<StudentPricingTier, 'id'>): void {
    const tempId = `TIER-${Date.now()}`;
    const newTier: StudentPricingTier = {
      ...tier,
      id: tempId
    };
    const updated = [...this.pricingTiers(), newTier].sort((a, b) => a.fromHours - b.fromHours);
    this.saveSettings({ ...this.settingsState(), pricingTiers: updated });

    const handleRoomResolution = (roomId?: string) => {
      if (roomId) {
        this.executeCreatePricingPlan(tempId, roomId, tier);
        return;
      }

      // Check current rooms in memory
      const availableRoom = this.rooms().find(r => r.isActive) || this.rooms()[0];
      if (availableRoom && availableRoom.id && !availableRoom.id.startsWith('ROOM-')) {
        this.executeCreatePricingPlan(tempId, availableRoom.id, tier);
        return;
      }

      // Fetch from API or create default room if DB has 0 rooms
      this.roomApi.getRooms().subscribe({
        next: (rooms) => {
          if (rooms && rooms.length > 0) {
            this.executeCreatePricingPlan(tempId, rooms[0].id, tier);
          } else {
            // Auto create default workspace room first so backend doesn't reject with 400
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
                  this.executeCreatePricingPlan(tempId, createdRoom.id, tier);
                }
              },
              error: (err) => console.error('[SettingsService] Failed to auto-create room:', err)
            });
          }
        },
        error: (err) => console.error('[SettingsService] Failed to fetch rooms for plan creation:', err)
      });
    };

    handleRoomResolution(tier.roomId);
  }

  private executeCreatePricingPlan(tempId: string, roomId: string, tier: Omit<StudentPricingTier, 'id'>): void {
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
          const synced = this.pricingTiers().map(t =>
            t.id === tempId ? { ...t, id: created.id, roomId: created.roomId, roomName: created.roomName } : t
          );
          this.saveSettings({ ...this.settingsState(), pricingTiers: synced });
        }
      },
      error: (err) => {
        console.error('[SettingsService] Failed to create pricing plan on backend:', err);
      }
    });
  }

  updatePricingTier(tier: StudentPricingTier): void {
    const updated = this.pricingTiers().map(t => (t.id === tier.id ? tier : t)).sort((a, b) => a.fromHours - b.fromHours);
    this.saveSettings({ ...this.settingsState(), pricingTiers: updated });

    if (tier.id && !tier.id.startsWith('TIER-')) {
      this.pricingPlanApi.updatePricingPlan(tier.id, {
        baseHours: tier.toHours,
        baseCost: tier.priceEgp,
        overageHourlyRate: 15,
        isActive: true,
        note: tier.labelAr || tier.labelEn
      }).subscribe({
        next: () => console.log('[SettingsService] Pricing tier updated on backend:', tier.id),
        error: (err) => console.error('[SettingsService] Update tier failed:', err)
      });
    }
  }

  deletePricingTier(id: string): void {
    const updated = this.pricingTiers().filter(t => t.id !== id);
    this.saveSettings({ ...this.settingsState(), pricingTiers: updated });

    if (id && !id.startsWith('TIER-')) {
      this.pricingPlanApi.deletePricingPlan(id).subscribe({
        next: () => console.log('[SettingsService] Pricing tier deleted on backend:', id),
        error: (err) => console.error('[SettingsService] Delete tier failed:', err)
      });
    }
  }

  // --- Rooms CRUD (Live Backend API) ---
  addRoom(room: Omit<RoomEntity, 'id'>): void {
    const tempId = `ROOM-${Date.now()}`;
    const resolvedImageUrl = (room.imageUrl && room.imageUrl.trim())
      ? room.imageUrl.trim()
      : (room.type === 'Silent Zone' ? '/images/rooms/room-design.jpg' : (room.type === 'Shared Space' ? '/images/rooms/room-studio.jpg' : '/images/rooms/room-workshop.jpg'));
    const newRoom: RoomEntity = {
      ...room,
      imageUrl: resolvedImageUrl,
      id: tempId
    };
    const updated = [newRoom, ...this.rooms()];
    this.saveSettings({ ...this.settingsState(), rooms: updated });

    this.roomApi.createRoom({
      name: room.name,
      capacity: room.capacity || 30,
      supportsWorkspace: room.type !== 'Classroom',
      supportsClassroom: room.type === 'Classroom',
      workspaceZone: room.type === 'Silent Zone' ? 2 : 1,
      description: room.name,
      isActive: room.isActive,
      imageUrl: resolvedImageUrl
    }).subscribe({
      next: (created) => {
        if (created && created.id) {
          const synced = this.rooms().map(r => r.id === tempId ? { ...r, id: created.id } : r);
          this.saveSettings({ ...this.settingsState(), rooms: synced });
        }
      },
      error: (err) => console.error('[SettingsService] Create room failed:', err)
    });
  }

  updateRoom(room: RoomEntity): void {
    const resolvedImageUrl = (room.imageUrl && room.imageUrl.trim())
      ? room.imageUrl.trim()
      : (room.type === 'Silent Zone' ? '/images/rooms/room-design.jpg' : (room.type === 'Shared Space' ? '/images/rooms/room-studio.jpg' : '/images/rooms/room-workshop.jpg'));
    const updatedRoom: RoomEntity = {
      ...room,
      imageUrl: resolvedImageUrl
    };
    const updated = this.rooms().map(r => (r.id === room.id ? updatedRoom : r));
    this.saveSettings({ ...this.settingsState(), rooms: updated });

    if (room.id && !room.id.startsWith('ROOM-')) {
      this.roomApi.updateRoom(room.id, {
        name: room.name,
        capacity: room.capacity || 30,
        supportsWorkspace: room.type !== 'Classroom',
        supportsClassroom: room.type === 'Classroom',
        workspaceZone: room.type === 'Silent Zone' ? 2 : 1,
        description: room.name,
        isActive: room.isActive,
        imageUrl: resolvedImageUrl
      }).subscribe({
        next: () => console.log('[SettingsService] Room updated on backend:', room.id),
        error: (err) => console.error('[SettingsService] Room update failed:', err)
      });
    }
  }

  deleteRoom(id: string): void {
    const updated = this.rooms().filter(r => r.id !== id);
    this.saveSettings({ ...this.settingsState(), rooms: updated });

    if (id && !id.startsWith('ROOM-')) {
      this.roomApi.deleteRoom(id).subscribe({
        next: () => console.log('[SettingsService] Room deleted on backend:', id),
        error: (err) => console.error('[SettingsService] Room delete failed:', err)
      });
    }
  }

  toggleRoomActive(id: string): void {
    const updated = this.rooms().map(r => (r.id === id ? { ...r, isActive: !r.isActive } : r));
    this.saveSettings({ ...this.settingsState(), rooms: updated });

    const target = updated.find(r => r.id === id);
    if (target && id && !id.startsWith('ROOM-')) {
      this.roomApi.updateRoom(id, {
        name: target.name,
        capacity: target.capacity || 30,
        supportsWorkspace: target.type !== 'Classroom',
        supportsClassroom: target.type === 'Classroom',
        workspaceZone: target.type === 'Silent Zone' ? 2 : 1,
        description: target.name,
        isActive: target.isActive,
        imageUrl: target.imageUrl
      }).subscribe({
        next: () => console.log('[SettingsService] Room status toggled on backend:', id),
        error: (err) => console.error('[SettingsService] Room status toggle failed:', err)
      });
    }
  }

  // --- Quick Package Presets CRUD (Live Backend API) ---
  addPackagePreset(preset: Omit<QuickPackagePreset, 'id'>): void {
    const tempId = `PRESET-${Date.now()}`;
    const newPreset: QuickPackagePreset = {
      ...preset,
      packageType: preset.packageType || 'student',
      id: tempId
    };
    const updated = [...this.packagePresets(), newPreset];
    this.saveSettings({ ...this.settingsState(), packagePresets: updated });

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
          const synced = this.packagePresets().map(p => p.id === tempId ? { ...p, id: created.id } : p);
          this.saveSettings({ ...this.settingsState(), packagePresets: synced });
        }
      },
      error: (err) => console.error('[SettingsService] Create package preset failed:', err)
    });
  }

  updatePackagePreset(preset: QuickPackagePreset): void {
    const updated = this.packagePresets().map(p => (p.id === preset.id ? preset : p));
    this.saveSettings({ ...this.settingsState(), packagePresets: updated });

    if (preset.id && !preset.id.startsWith('PRESET-')) {
      this.packagePricingPlanApi.updatePackagePricingPlan(preset.id, {
        name: preset.nameAr || preset.nameEn || `${preset.hours} Hours Package`,
        packageType: preset.packageType === 'instructor' ? PackageType.Classroom : PackageType.Workspace,
        hours: preset.hours,
        price: preset.price,
        validityDays: preset.validityDays,
        isActive: true
      }).subscribe({
        next: () => console.log('[SettingsService] Package updated on backend:', preset.id),
        error: (err) => console.error('[SettingsService] Package update failed:', err)
      });
    }
  }

  deletePackagePreset(id: string): void {
    const updated = this.packagePresets().filter(p => p.id !== id);
    this.saveSettings({ ...this.settingsState(), packagePresets: updated });

    if (id && !id.startsWith('PRESET-')) {
      this.packagePricingPlanApi.deletePackagePricingPlan(id).subscribe({
        next: () => console.log('[SettingsService] Package deleted on backend:', id),
        error: (err) => console.error('[SettingsService] Package delete failed:', err)
      });
    }
  }
}
