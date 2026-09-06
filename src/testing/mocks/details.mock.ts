// [MOCK DATA FOR TESTING / PRESENTATION ONLY]
// This file stores sample mock datasets for offline presentation, UI tests, and demo reviews.
// Live production features use DetailsService and respective backend APIs (https://nook.runasp.net).

import { DiscountCode, BlacklistRecord, College, Instructor } from '../../app/core/models/details.model';

export const MOCK_DISCOUNTS: DiscountCode[] = [
  {
    id: 'DSC-101',
    code: 'SUMMER25',
    title: 'خصم الصيف الطلابي',
    titleEn: 'Summer Student Pass Discount',
    type: 'percentage',
    value: 25,
    scope: 'students',
    usageCount: 48,
    usageLimit: 100,
    startDate: '2026-06-01',
    expiryDate: '2026-09-15',
    status: 'active',
    totalDiscountSaved: 3600,
    createdAt: '2026-06-01T09:00:00.000Z'
  },
  {
    id: 'DSC-102',
    code: 'NOOKSTUDENT',
    title: 'كوبون الترحيب بالطالب',
    titleEn: 'Student Welcome Coupon',
    type: 'fixed',
    value: 50,
    scope: 'students',
    usageCount: 85,
    usageLimit: 150,
    startDate: '2026-01-01',
    expiryDate: '2026-12-31',
    status: 'active',
    totalDiscountSaved: 4250,
    createdAt: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 'DSC-103',
    code: 'PARTNER10',
    title: 'خصم المحاضرين الشركاء',
    titleEn: 'Instructor Partner Discount',
    type: 'percentage',
    value: 15,
    scope: 'instructors',
    usageCount: 19,
    usageLimit: 50,
    startDate: '2026-05-01',
    expiryDate: '2026-11-30',
    status: 'active',
    totalDiscountSaved: 5700,
    createdAt: '2026-05-01T10:00:00.000Z'
  },
  {
    id: 'DSC-104',
    code: 'TECHMEETUP',
    title: 'خصم ورش العمل التكنولوجية',
    titleEn: 'Tech Meetup Pass Offer',
    type: 'fixed',
    value: 100,
    scope: 'packages',
    usageCount: 40,
    usageLimit: 40,
    startDate: '2026-07-01',
    expiryDate: '2026-08-30',
    status: 'expired',
    totalDiscountSaved: 4000,
    createdAt: '2026-07-01T11:00:00.000Z'
  },
  {
    id: 'DSC-105',
    code: 'WELCOME50',
    title: 'كوبون الجلسة الأولى مجاناً',
    titleEn: 'First Session Voucher',
    type: 'fixed',
    value: 30,
    scope: 'all',
    usageCount: 112,
    usageLimit: 200,
    startDate: '2026-03-01',
    expiryDate: '2026-10-31',
    status: 'active',
    totalDiscountSaved: 3360,
    createdAt: '2026-03-01T09:30:00.000Z'
  }
];

export const MOCK_BLACKLIST: BlacklistRecord[] = [
  {
    id: 'BLK-101',
    name: 'أحمد سعيد القاضي',
    nameEn: 'Ahmed Said Al-Kadi',
    phone: '01011223344',
    faculty: 'هندسة - جامعة القاهرة',
    facultyEn: 'Engineering - Cairo Univ',
    reason: 'تكرار التأخير في إخلاء القاعة وتسبب في إزعاج الجلسات الأخرى',
    reasonEn: 'Repeated late room clearance and disruption of sessions',
    blockedDate: '2026-08-10',
    severity: 'temporary',
    status: 'blocked',
    notes: 'حظر مؤقت لمدة 30 يوم للتنبيه والالتزام بمواعيد الإخلاء'
  },
  {
    id: 'BLK-102',
    name: 'ندى إبراهيم خليل',
    nameEn: 'Nada Ibrahim Khalil',
    phone: '01122334455',
    faculty: 'طب بشري - جامعة عين شمس',
    facultyEn: 'Medicine - Ain Shams Univ',
    reason: 'عدم سداد مستحقات الكانتين والطباعة لعدة جلسات متتالية',
    reasonEn: 'Unpaid catering and handout printing dues across multiple sessions',
    blockedDate: '2026-08-15',
    severity: 'temporary',
    status: 'blocked',
    notes: 'حظر مؤقت لحين تسوية المستحقات المالية المستحقة'
  },
  {
    id: 'BLK-103',
    name: 'محمود عبد الفتاح',
    nameEn: 'Mahmoud Abdel-Fattah',
    phone: '01233445566',
    faculty: 'تجارة - جامعة حلوان',
    facultyEn: 'Business - Helwan Univ',
    reason: 'مخالفة لائحة الهدوء والتدخين داخل المنطقة المخصصة للمذاكرة',
    reasonEn: 'Violation of quiet study zone and smoking rules',
    blockedDate: '2026-07-28',
    severity: 'permanent',
    status: 'blocked',
    notes: 'حظر دائم بسبب تكرار المخالفات السلوكية بعد التنبيه الشفهي'
  }
];

export const MOCK_COLLEGES: College[] = [
  {
    id: 'COL-101',
    name: 'كلية الهندسة',
    nameEn: 'Faculty of Engineering',
    university: 'جامعة القاهرة',
    universityEn: 'Cairo University',
    studentsCount: 142,
    campus: 'مجمع الجيزة الرئيسي',
    campusEn: 'Giza Main Campus',
    notes: 'أكبر نسبة حضور واستخدام لباقات المذاكرة والعمل الجماعي',
    createdAt: '2026-08-01T09:00:00.000Z'
  },
  {
    id: 'COL-102',
    name: 'كلية الطب البشري',
    nameEn: 'Faculty of Medicine',
    university: 'جامعة عين شمس',
    universityEn: 'Ain Shams University',
    studentsCount: 98,
    campus: 'مجمع العباسية الطبي',
    campusEn: 'Abbassia Medical Campus',
    notes: 'حضور مكثف خلال فترة الاختبارات وساعات المذاكرة الهادئة',
    createdAt: '2026-07-15T12:00:00.000Z'
  },
  {
    id: 'COL-103',
    name: 'كلية الحاسبات والذكاء الاصطناعي',
    nameEn: 'Faculty of Computers & AI',
    university: 'جامعة حلوان',
    universityEn: 'Helwan University',
    studentsCount: 76,
    campus: 'حرم عين حلوان',
    campusEn: 'Helwan Campus',
    notes: 'مجموعات عمل برمجية ومشاريع تخرج مشتركة',
    createdAt: '2026-08-05T10:30:00.000Z'
  }
];

export const MOCK_INSTRUCTORS: Instructor[] = [
  {
    id: 'INS-101',
    name: 'د. محمد طه',
    nameEn: 'Dr. Mohamed Taha',
    phone: '01001122334',
    email: 'dr.mohamed.taha@example.com',
    specialty: 'الذكاء الاصطناعي والبرمجة',
    specialtyEn: 'AI & Data Science',
    affiliation: 'جامعة القاهرة',
    affiliationEn: 'Cairo University',
    totalSessions: 14,
    status: 'active',
    bio: 'محاضر دكتوراه في علوم الحاسب والذكاء الاصطناعي وتطبيقاته',
    createdAt: '2026-08-01T09:00:00.000Z'
  },
  {
    id: 'INS-102',
    name: 'م. رضوى سامح',
    nameEn: 'Eng. Radwa Sameh',
    phone: '01112233445',
    email: 'radwa.sameh@example.com',
    specialty: 'تصميم واجهات المستخدم UI/UX',
    specialtyEn: 'UI/UX Design',
    affiliation: 'مستقلة / Free Consultancy',
    affiliationEn: 'Independent Consultant',
    totalSessions: 22,
    status: 'active',
    bio: 'خبيرة تصميم تجربة المستخدم والمنتجات الرقمية والتفاعل البصري',
    createdAt: '2026-07-15T12:00:00.000Z'
  },
  {
    id: 'INS-103',
    name: 'أ. أحمد فاروق',
    nameEn: 'Ahmed Farouk',
    phone: '01223344556',
    email: 'ahmed.farouk@example.com',
    specialty: 'أمن المعلومات والسيبراني',
    specialtyEn: 'Cybersecurity',
    affiliation: 'أكاديمية تك جيت',
    affiliationEn: 'TechGate Academy',
    totalSessions: 8,
    status: 'active',
    bio: 'استشاري أمن شبكات واختبار اختراق للمؤسسات والشركات',
    createdAt: '2026-08-05T10:30:00.000Z'
  }
];
