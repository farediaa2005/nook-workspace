// [MOCK DATA FOR TESTING / PRESENTATION ONLY]
// This file contains offline mock datasets for Shift management.
// In runtime mode, the application is strictly connected to live API endpoints.

import { ShiftRecord, ShiftHistoryItem, ShiftTransaction } from '../../app/core/models/shift.model';

export const USE_SHIFT_MOCK_DATA = false;

export const MOCK_ACTIVE_SHIFT: ShiftRecord = {
  id: 'SHIFT-2024-001',
  staffName: 'Sarah Jenkins',
  staffEmail: 'sarah.jenkins@nook.io',
  role: 'Reception Staff',
  startTime: '09:00 AM',
  status: 'active',
  initialCashDrawer: 1250.00,
  startVodafoneCash: 500.00,
  startInstapay: 1500.00,
  startFawry: 350.00,
  canteenRevenue: 140.00,
  classroomRevenue: 820.00,
  workspaceRevenue: 450.00,
  packageRevenue: 200.00,
  otherIncome: 60.00,
  adminExpenses: 75.00,
  vodafoneCashInside: 350.00,
  vodafoneCashOutside: 100.00,
  instapayCashInside: 600.00,
  instapayCashOutside: 0.00,
  fawryCashInside: 220.00,
  fawryCashOutside: 50.00,
  totalRevenue: 1670.00,
  transactionsCount: 6,
  transactions: [
    {
      id: 'TX-1001',
      timestamp: '12:15 PM',
      details: 'حجز مساحة عمل مشتركة - أحمد ممدوح',
      type: 'workspace',
      paymentMethod: 'cash',
      amount: 150.00,
      staffName: 'Sarah Jenkins'
    },
    {
      id: 'TX-1002',
      timestamp: '11:45 AM',
      details: 'تحويل إنستاباي - اشتراك باقة طالب',
      type: 'package',
      paymentMethod: 'instapay',
      amount: 350.00,
      staffName: 'Sarah Jenkins'
    },
    {
      id: 'TX-1003',
      timestamp: '11:10 AM',
      details: 'مشتريات مستلزمات نظافة وضيافة (نثريات)',
      type: 'expense',
      paymentMethod: 'petty_cash',
      amount: -75.00,
      staffName: 'Sarah Jenkins'
    },
    {
      id: 'TX-1004',
      timestamp: '10:30 AM',
      details: 'حجز قاعة اجتماعات B - شركة النور',
      type: 'classroom',
      paymentMethod: 'fawry',
      amount: 400.00,
      staffName: 'Sarah Jenkins'
    },
    {
      id: 'TX-1005',
      timestamp: '09:45 AM',
      details: 'إيداع فودافون كاش - رصيد محفظة',
      type: 'vodafone_in',
      paymentMethod: 'vodafone',
      amount: 250.00,
      staffName: 'Sarah Jenkins'
    },
    {
      id: 'TX-1006',
      timestamp: '09:00 AM',
      details: 'رصيد افتتاح الوردية (الخزينة والدرج)',
      type: 'system',
      paymentMethod: '-',
      amount: 1250.00,
      staffName: 'Sarah Jenkins'
    }
  ]
};

export const MOCK_SHIFT_HISTORY_ITEMS: ShiftHistoryItem[] = [
  {
    id: 'SH-1024',
    staffName: 'Michael Chen',
    staffAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    date: '24 أكتوبر 2023',
    startTime: '08:00 ص',
    endTime: '04:00 م',
    cashIn: 1250.00,
    cashOut: 340.00,
    finalTotal: 1737.50,
    variance: 0.00,
    status: 'balanced'
  },
  {
    id: 'SH-1023',
    staffName: 'Sarah Jenkins',
    staffAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    date: '23 أكتوبر 2023',
    startTime: '03:30 م',
    endTime: '11:30 م',
    cashIn: 890.00,
    cashOut: 45.00,
    finalTotal: 2165.00,
    variance: -20.00,
    status: 'disputed'
  },
  {
    id: 'SH-1022',
    staffName: 'David Okafor',
    staffAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    date: '22 أكتوبر 2023',
    startTime: '08:00 ص',
    endTime: '04:00 م',
    cashIn: 620.00,
    cashOut: 0.00,
    finalTotal: 1240.00,
    variance: 0.00,
    status: 'balanced'
  }
];
