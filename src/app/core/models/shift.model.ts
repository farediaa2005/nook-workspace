export type ShiftTransactionType = 
  | 'canteen' 
  | 'classroom' 
  | 'workspace' 
  | 'package' 
  | 'expense' 
  | 'vodafone_in' 
  | 'vodafone_out' 
  | 'instapay_in' 
  | 'instapay_out' 
  | 'fawry_in' 
  | 'fawry_out' 
  | 'system';

export type ShiftPaymentMethod = 
  | 'cash' 
  | 'card' 
  | 'app' 
  | 'room_session' 
  | 'vodafone' 
  | 'fawry' 
  | 'instapay' 
  | 'package' 
  | 'petty_cash' 
  | '-';

export interface ShiftTransaction {
  id: string;
  type: ShiftTransactionType;
  amount: number;
  paymentMethod: ShiftPaymentMethod;
  staffName: string;
  details: string;
  timestamp: string;
  flowDirection?: 'inside' | 'outside' | 'none';
}

export interface ShiftRecord {
  id: string;
  staffName: string;
  staffEmail: string;
  role: string;
  avatar?: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'closed';
  
  // Starting Floats
  initialCashDrawer: number;
  adminFund?: number;
  startVodafoneCash?: number;
  startInstapay?: number;
  startFawry?: number;

  // Category Revenues
  canteenRevenue: number;
  classroomRevenue: number;
  workspaceRevenue: number;
  packageRevenue: number;
  otherIncome?: number;
  adminExpenses?: number;

  // 4 Payment Channels Flows
  vodafoneCashInside?: number;
  vodafoneCashOutside?: number;
  instapayCashInside?: number;
  instapayCashOutside?: number;
  fawryCashInside?: number;
  fawryCashOutside?: number;

  totalRevenue: number;
  transactionsCount: number;
  transactions: ShiftTransaction[];
}

export interface ShiftHistoryItem {
  id: string;
  staffName: string;
  staffAvatar?: string;
  date: string;
  startTime: string;
  endTime: string;
  cashIn: number;
  cashOut: number;
  finalTotal: number;
  variance: number;
  status: 'balanced' | 'disputed';
  notes?: string;
}
