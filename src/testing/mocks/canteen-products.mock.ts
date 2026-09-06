import { CateringProductItem } from '../../app/core/models/classroom.model';

export const DEFAULT_CANTEEN_PRODUCTS: CateringProductItem[] = [
  { id: 'coffee', nameEn: 'Espresso / Coffee', nameAr: 'قهوة / إسبريسو', price: 25, count: 0 },
  { id: 'tea', nameEn: 'Hot Tea / Herbs', nameAr: 'شاي / أعشاب ساخنة', price: 15, count: 0 },
  { id: 'water', nameEn: 'Mineral Water', nameAr: 'مياه معدنية', price: 10, count: 0 },
  { id: 'soda', nameEn: 'Soft Drink / Soda', nameAr: 'مشروب غازي / كانز', price: 20, count: 0 },
  { id: 'snack', nameEn: 'Snack / Croissant', nameAr: 'سناك / كرواسون', price: 30, count: 0 },
  { id: 'lunch', nameEn: 'Team Lunch / Meal', nameAr: 'وجبة غداء جماعية', price: 120, count: 0 }
];
