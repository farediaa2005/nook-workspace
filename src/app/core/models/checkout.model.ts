/**
 * Canonical Checkout and Billing Domain Models.
 * Clean Architecture Layer 1.
 */

export type PaymentMethodType = 'cash' | 'vodafone' | 'fawry' | 'instapay' | 'package';

interface CateringLineItem {
  id: string;
  name: string;
  price: number;
}

interface FinancialBreakdownItem {
  id?: string;
  icon?: 'clock' | 'canteen' | 'printing' | 'custom';
  title: string;
  subtitle?: string;
  amount: number;
  isCatering?: boolean;
  isPrinting?: boolean;
  canEdit?: boolean;
  canAdd?: boolean;
  buttonLabel?: string;
}

interface CheckoutSessionData {
  activity: string;
  studentName?: string;
  roomName?: string;
  status: 'active' | 'completed' | 'scheduled' | string;
  startTime: string;
  endTime?: string;
  duration: string;
  /** Elapsed minutes of the session; used to warn about sessions left open by mistake. */
  durationMinutes?: number;
}

interface CheckoutFinancialData {
  items: FinancialBreakdownItem[];
  cateringItems?: CateringLineItem[];
  subtotal: number;
  discountPercent?: number;
  couponCode?: string;
  couponDiscount?: number;
  loyaltyDiscount?: number;
  manualAdjustment?: number;
  walletBalance?: number;
  newWalletBalance?: number;
  finalTotal: number;
}

interface CheckoutPaymentData {
  selectedMethod: PaymentMethodType;
  amountReceived: number | null;
  changeDue: number;
  buttonText?: string;
  isProcessing?: boolean;
}

export interface CheckoutData {
  type: 'student' | 'classroom' | 'workspace' | string;
  title: string;
  subtitle?: string;
  session: CheckoutSessionData;
  financialBreakdown: CheckoutFinancialData;
  payment: CheckoutPaymentData;
}

export interface ProcessPaymentEvent {
  paymentMethod: PaymentMethodType;
  amountReceived: number | null;
  changeDue: number;
  finalTotal: number;
  discountPercent?: number;
  couponCode?: string;
  walletMode?: 'none' | 'debit' | 'credit';
  walletAdjustment?: number;
  newWalletBalance?: number;
  netCashDue?: number;
}
