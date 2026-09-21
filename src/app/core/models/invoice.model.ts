export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type?: 'room' | 'catering' | 'printing' | 'addon' | 'discount';
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string; // ISO date or formatted
  dueDate?: string;
  clientType: 'Student' | 'Instructor' | 'Guest';
  clientName: string;
  clientIdentifier?: string; // Student ID / Phone
  clientCollege?: string;
  roomOrDesk: string;
  activity?: string;
  checkInTime: string;
  checkOutTime: string;
  durationFormatted: string;
  actualDurationFormatted?: string; // e.g. "1 ساعة و 46 دقيقة"
  actualMinutesSpent?: number; // e.g. 106
  billedDurationFormatted?: string; // e.g. "2 ساعات"
  durationDifferenceText?: string; // e.g. "مغادرة مبكرة بـ 14 دقيقة" or "وقت إضافي: 30 دقيقة"
  cateringItemsBreakdown?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  discountReason?: string;
  cateringAmount: number;
  printingAmount: number;
  taxAmount: number;
  finalTotal: number;
  amountReceived: number;
  changeDue: number;
  paymentMethod: string;
  cashierName: string;
  shiftId?: string;
  notes?: string;
}
