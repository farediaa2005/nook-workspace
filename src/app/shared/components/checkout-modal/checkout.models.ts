export type PaymentMethodType = 'cash' | 'vodafone' | 'fawry' | 'instapay' | 'package';

export interface CateringLineItem {
  id: string;
  name: string;
  price: number;
}

export interface FinancialBreakdownItem {
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

export interface CheckoutSessionData {
  activity: string;
  status: 'active' | 'completed' | 'scheduled' | string;
  startTime: string;
  endTime?: string;
  duration: string;
}

export interface CheckoutFinancialData {
  items: FinancialBreakdownItem[];
  cateringItems?: CateringLineItem[];
  subtotal: number;
  discountPercent?: number;
  couponCode?: string;
  couponDiscount?: number;
  loyaltyDiscount?: number;
  manualAdjustment?: number;
  finalTotal: number;
}

export interface CheckoutPaymentData {
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
}
