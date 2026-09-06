// [MOCK DATA FOR TESTING / PRESENTATION ONLY]
// This file contains offline mock datasets for System Settings (Pricing Tiers, Room Entities, Package Presets).
// In live runtime mode, the application is strictly connected to backend API endpoints.

export interface StudentPricingTier {
  id: string;
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
  hours: number;
  price: number;
  validityDays: 15 | 30 | 60;
  nameAr?: string;
  nameEn?: string;
}

export const USE_SETTINGS_MOCK_DATA = false;

export const MOCK_PRICING_TIERS: StudentPricingTier[] = [
  { id: 'TIER-1', fromHours: 0, toHours: 1, priceEgp: 10, labelAr: 'ساعة واحدة', labelEn: '1st Hour' },
  { id: 'TIER-2', fromHours: 1, toHours: 3, priceEgp: 30, labelAr: '1 إلى 3 ساعات', labelEn: '1-3 Hours' },
  { id: 'TIER-3', fromHours: 3, toHours: 6, priceEgp: 45, labelAr: '3 إلى 6 ساعات', labelEn: '3-6 Hours' },
  { id: 'TIER-4', fromHours: 6, toHours: 24, priceEgp: 60, labelAr: 'يوم كامل (6+ ساعات)', labelEn: 'Full Day (6+ Hrs)' }
];

export const MOCK_SETTINGS_ROOMS: RoomEntity[] = [
  {
    id: 'ROOM-101',
    name: 'قاعة المحاضرات الكبرى (Hall A)',
    nameEn: 'Main Lecture Hall A',
    type: 'Classroom',
    capacity: 45,
    hourlyPrice: 150,
    imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80',
    isActive: true
  },
  {
    id: 'ROOM-102',
    name: 'قاعة التدريب التفاعلية (Hall B)',
    nameEn: 'Workshop Studio B',
    type: 'Classroom',
    capacity: 25,
    hourlyPrice: 100,
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
    isActive: true
  },
  {
    id: 'ROOM-103',
    name: 'منطقة المذاكرة الصامتة (Silent Focus)',
    nameEn: 'Silent Focus Zone',
    type: 'Silent Zone',
    capacity: 30,
    hourlyPrice: 20,
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
    isActive: true
  },
  {
    id: 'ROOM-104',
    name: 'مساحة العمل المشتركة (Shared Workspace)',
    nameEn: 'Shared Open Space',
    type: 'Shared Space',
    capacity: 60,
    hourlyPrice: 15,
    imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80',
    isActive: true
  }
];

export const MOCK_PACKAGE_PRESETS: QuickPackagePreset[] = [
  { id: 'PRESET-10', hours: 10, price: 220, validityDays: 30, nameAr: 'باقة 10 ساعات', nameEn: '10 Hours Pass' },
  { id: 'PRESET-20', hours: 20, price: 400, validityDays: 30, nameAr: 'باقة 20 ساعة', nameEn: '20 Hours Pass' },
  { id: 'PRESET-50', hours: 50, price: 900, validityDays: 60, nameAr: 'باقة 50 ساعة', nameEn: '50 Hours Pass' }
];
