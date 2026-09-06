// [MOCK DATA FOR TESTING / PRESENTATION ONLY]
// This file contains offline mock datasets for Student and Instructor packages.
// In runtime mode, the application is strictly connected to live API endpoints.

import { PackageItem, PackageMemberOption } from '../../app/core/models/package.model';

export const MOCK_PACKAGE_MEMBERS: PackageMemberOption[] = [
  {
    id: 'STU-001',
    nameAr: 'عمر حسن',
    nameEn: 'Omar Hassan',
    subAr: 'هندسة - جامعة القاهرة',
    subEn: 'Engineering - Cairo Univ',
    phone: '01012345678',
    email: 'omar.hassan@example.com',
    type: 'student'
  },
  {
    id: 'STU-002',
    nameAr: 'مريم يوسف',
    nameEn: 'Mariam Youssef',
    subAr: 'طب بشري - جامعة عين شمس',
    subEn: 'Medicine - Ain Shams Univ',
    phone: '01123456789',
    email: 'mariam.youssef@example.com',
    type: 'student'
  },
  {
    id: 'INS-001',
    nameAr: 'د. محمد طه',
    nameEn: 'Dr. Mohamed Taha',
    subAr: 'محاضر ذكاء اصطناعي وبرمجة',
    subEn: 'AI & Data Science Lecturer',
    phone: '01001122334',
    email: 'dr.mohamed.taha@example.com',
    type: 'instructor'
  },
  {
    id: 'INS-002',
    nameAr: 'م. أحمد الشناوي',
    nameEn: 'Eng. Ahmed El-Shennawy',
    subAr: 'مدرب تطوير البرمجيات السحابية',
    subEn: 'Cloud Solutions Architect',
    phone: '01223344556',
    email: 'ahmed.shennawy@example.com',
    type: 'instructor'
  }
];

export const MOCK_PACKAGES: PackageItem[] = [
  {
    id: 'PKG-1001',
    memberId: 'STU-001',
    memberNameAr: 'عمر حسن',
    memberNameEn: 'Omar Hassan',
    memberSubAr: 'هندسة - جامعة القاهرة',
    memberSubEn: 'Engineering - Cairo Univ',
    memberPhone: '01012345678',
    memberEmail: 'omar.hassan@example.com',
    members: [MOCK_PACKAGE_MEMBERS[0]],
    type: 'student',
    packageNameAr: 'باقة المذاكرة الذهبية (20 ساعة)',
    packageNameEn: 'Golden Focus Pass (20 hrs)',
    allocatedHours: 20,
    usedHours: 6.5,
    remainingHours: 13.5,
    cost: 450,
    hourlyRate: 22.5,
    purchaseDate: '2026-08-01',
    expiryDate: '2026-09-01',
    paymentMethod: 'cash',
    status: 'active',
    notes: 'باقة طالب نشط',
    history: [
      {
        id: 'USG-001',
        date: '2026-08-05 14:00',
        duration: 3.5,
        sessionAr: 'جلسة مذاكرة فردية',
        sessionEn: 'Individual Study Session',
        roomOrDesk: 'Quiet Desk #04'
      },
      {
        id: 'USG-002',
        date: '2026-08-10 16:30',
        duration: 3.0,
        sessionAr: 'مذاكرة مشروع التخرج',
        sessionEn: 'Graduation Project Prep',
        roomOrDesk: 'Quiet Desk #08'
      }
    ],
    createdAt: '2026-08-01T10:00:00.000Z'
  },
  {
    id: 'PKG-2001',
    memberId: 'INS-001',
    memberNameAr: 'د. محمد طه',
    memberNameEn: 'Dr. Mohamed Taha',
    memberSubAr: 'محاضر ذكاء اصطناعي وبرمجة',
    memberSubEn: 'AI & Data Science Lecturer',
    memberPhone: '01001122334',
    memberEmail: 'dr.mohamed.taha@example.com',
    members: [MOCK_PACKAGE_MEMBERS[2]],
    type: 'instructor',
    packageNameAr: 'باقة تدريب القاعات المتقدمة (50 ساعة)',
    packageNameEn: 'Advanced Training Hall Pack (50 hrs)',
    allocatedHours: 50,
    usedHours: 12,
    remainingHours: 38,
    cost: 4500,
    hourlyRate: 90,
    purchaseDate: '2026-08-15',
    expiryDate: '2026-10-15',
    paymentMethod: 'vodafone',
    status: 'active',
    notes: 'باقة معسكر الذكاء الاصطناعي',
    history: [
      {
        id: 'USG-101',
        date: '2026-08-18 10:00',
        duration: 6,
        sessionAr: 'ورشة عمل تعلم الآلة - اليوم الأول',
        sessionEn: 'Machine Learning Lab - Day 1',
        roomOrDesk: 'Hall A (Main Classroom)'
      },
      {
        id: 'USG-102',
        date: '2026-08-25 10:00',
        duration: 6,
        sessionAr: 'ورشة عمل تعلم الآلة - اليوم الثاني',
        sessionEn: 'Machine Learning Lab - Day 2',
        roomOrDesk: 'Hall A (Main Classroom)'
      }
    ],
    createdAt: '2026-08-15T09:00:00.000Z'
  }
];
