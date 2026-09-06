import { CateringProduct } from '../../app/core/models/catering.model';

export const MOCK_CATERING_PRODUCTS: CateringProduct[] = [
  {
    id: 'PROD-001',
    name: 'Premium Water Bottle',
    nameAr: 'زجاجة مياه بريميوم',
    category: 'Merchandise',
    categoryAr: 'منتجات المساحة',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=100&auto=format&fit=crop&q=80',
    icon: 'bottle',
    sellingPrice: 25.00,
    costPrice: 10.00,
    stock: 145,
    expirationDate: 'N/A',
    isExpired: false,
    status: 'healthy',
    marginPercent: 60,
    soldCount: 48,
    totalRevenue: 1200.00
  },
  {
    id: 'PROD-002',
    name: 'Nook Ceramic Mug',
    nameAr: 'مج سيراميك نوك',
    category: 'Merchandise',
    categoryAr: 'منتجات المساحة',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=100&auto=format&fit=crop&q=80',
    icon: 'mug',
    sellingPrice: 15.00,
    costPrice: 5.00,
    stock: 8,
    expirationDate: 'N/A',
    isExpired: false,
    status: 'low_stock',
    marginPercent: 66,
    soldCount: 35,
    totalRevenue: 525.00
  },
  {
    id: 'PROD-003',
    name: 'Artisan Dark Chocolate',
    nameAr: 'شوكولاتة داكنة فاخرة',
    category: 'Snacks',
    categoryAr: 'سناكس وتسالي',
    image: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=100&auto=format&fit=crop&q=80',
    icon: 'cookie',
    sellingPrice: 6.00,
    costPrice: 2.50,
    stock: 42,
    expirationDate: 'Oct 15, 2026',
    isExpired: false,
    status: 'expiring_soon',
    marginPercent: 58,
    soldCount: 92,
    totalRevenue: 414.00
  },
  {
    id: 'PROD-004',
    name: 'Cold Pressed Green Juice',
    nameAr: 'عصير أخضر معصور على البارد',
    category: 'Beverages',
    categoryAr: 'مشروبات وعصائر',
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=100&auto=format&fit=crop&q=80',
    icon: 'glass',
    sellingPrice: 8.50,
    costPrice: 3.00,
    stock: 12,
    expirationDate: 'Sep 01, 2026',
    isExpired: true,
    status: 'expired',
    marginPercent: 64,
    soldCount: 65,
    totalRevenue: 552.50
  },
  {
    id: 'PROD-005',
    name: 'Oat Milk Latte',
    nameAr: 'لاتيه حليب الشوفان',
    category: 'Coffee',
    categoryAr: 'قهوة ومشروبات ساخنة',
    image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=100&auto=format&fit=crop&q=80',
    icon: 'coffee',
    sellingPrice: 5.50,
    costPrice: 1.80,
    stock: 200,
    expirationDate: 'N/A',
    isExpired: false,
    status: 'healthy',
    marginPercent: 67,
    soldCount: 142,
    totalRevenue: 781.00
  },
  {
    id: 'PROD-006',
    name: 'Avocado Toast',
    nameAr: 'توست الأفوكادو',
    category: 'Meals',
    categoryAr: 'وجبات وسندوتشات',
    image: 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=100&auto=format&fit=crop&q=80',
    icon: 'toast',
    sellingPrice: 7.00,
    costPrice: 2.80,
    stock: 50,
    expirationDate: 'Today',
    isExpired: false,
    status: 'healthy',
    marginPercent: 60,
    soldCount: 85,
    totalRevenue: 595.00
  },
  {
    id: 'PROD-007',
    name: 'Almond Croissant',
    nameAr: 'كرواسون اللوز',
    category: 'Snacks',
    categoryAr: 'سناكس ومخبوزات',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=100&auto=format&fit=crop&q=80',
    icon: 'croissant',
    sellingPrice: 4.50,
    costPrice: 1.50,
    stock: 30,
    expirationDate: 'Today',
    isExpired: false,
    status: 'healthy',
    marginPercent: 66,
    soldCount: 92,
    totalRevenue: 414.00
  },
  {
    id: 'PROD-008',
    name: 'Cold Brew Coffee',
    nameAr: 'قهوة كولد برو مثلجة',
    category: 'Coffee',
    categoryAr: 'قهوة ومشروبات مثلجة',
    image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=100&auto=format&fit=crop&q=80',
    icon: 'coffee',
    sellingPrice: 5.00,
    costPrice: 1.50,
    stock: 120,
    expirationDate: 'N/A',
    isExpired: false,
    status: 'healthy',
    marginPercent: 70,
    soldCount: 76,
    totalRevenue: 380.00
  }
];

export const MOCK_CATEGORIES: { value: string; labelEn: string; labelAr: string }[] = [
  { value: 'Snacks', labelEn: 'Snacks & Bakery', labelAr: 'سناكس ومخبوزات' },
  { value: 'Merchandise', labelEn: 'Merchandise', labelAr: 'منتجات المساحة (Merch)' },
  { value: 'Beverages', labelEn: 'Beverages', labelAr: 'مشروبات وعصائر' },
  { value: 'Coffee', labelEn: 'Coffee & Hot Drinks', labelAr: 'قهوة ومشروبات ساخنة' },
  { value: 'Meals', labelEn: 'Meals & Sandwiches', labelAr: 'وجبات وسندوتشات' }
];

export const MOCK_CATEGORY_REVENUE = [
  { category: 'Coffee', categoryAr: 'القهوة', amount: 380, maxAmount: 400, percentage: 95 },
  { category: 'Snacks', categoryAr: 'السناكس', amount: 240, maxAmount: 400, percentage: 60 },
  { category: 'Meals', categoryAr: 'الوجبات', amount: 310, maxAmount: 400, percentage: 77 }
];

export const MOCK_PAYMENT_BREAKDOWN = {
  cardPercent: 65,
  appPercent: 23,
  cashPercent: 12,
  totalTxns: 324
};

export const MOCK_SESSION_PREVIOUS_ITEMS = [
  { name: 'Cold Pressed Green Juice', nameAr: 'عصير أخضر فريش معصور ع البارد', price: 8.50, quantity: 2, total: 17.00, time: '1 hr ago' },
  { name: 'Oat Milk Latte', nameAr: 'قهوة لاتيه بحليب الشوفان', price: 5.50, quantity: 2, total: 11.00, time: '30 mins ago' }
];
