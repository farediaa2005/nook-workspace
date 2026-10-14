/**
 * Shift API domain models matching Backend OpenAPI & NookWorkspace API specifications.
 * Endpoints:
 * - GET    /api/shifts                -> ApiResponse<IEnumerable<ShiftDto>> (Query: ?userId=guid&status=Open)
 * - GET    /api/shifts/{id}           -> ApiResponse<ShiftDetailDto>
 * - GET    /api/shifts/open/{userId}  -> ApiResponse<ShiftDto>
 * - GET    /api/shifts/current        -> ApiResponse<ShiftDetailDto>
 * - POST   /api/shifts                -> ApiResponse<ShiftDto> (Open Shift)
 * - PUT    /api/shifts/{id}/close     -> ApiResponse<ShiftDto> (Close Shift)
 * - POST   /api/shifts/{id}/items     -> ApiResponse<ShiftItemDto> (Add Shift Item)
 * - DELETE /api/shifts/{id}/items/{itemId} -> ApiResponse<bool>
 * - POST   /api/shifts/{id}/verify-password -> { verified: boolean, message: string }
 * - POST   /api/shifts/verify-password     -> { verified: boolean, message: string }
 * - POST   /api/shifts/{id}/recalculate    -> ApiResponse<ShiftDetailDto>
 *
 * SessionStatus enum: Open | Closed | Cancelled (or numeric: 1=Open/Active, 2=Closed/Completed, 4=Cancelled)
 * ShiftItemCategory enum: Income | Expense (or lowercase / custom types)
 * PayWay enum: 1=Cash, 2=VodafoneCash, 3=InstaPay, 4=Fawry
 */

/** Session status enum values */
export type SessionStatusType = 'Open' | 'Closed' | 'Cancelled' | 'active' | 'completed' | number;

/** Shift Item Category values (from API enum: Income, Expense, etc.) */
export type ShiftItemCategory =
  | 'Income'
  | 'Expense'
  | 'canteen'
  | 'classroom'
  | 'workspace'
  | 'package'
  | 'expense'
  | 'revenue'
  | 'other'
  | string;

/** Shift response DTO from GET /api/shifts and /api/shifts/{id} */
export interface ShiftDto {
  id: string;
  userId?: string | null;
  userName?: string | null;
  openingBalance?: number;        // Documented API: Initial cash drawer balance
  closingBalance?: number | null; // Documented API: Actual closing drawer balance
  notes?: string | null;          // Documented API: Operational shift notes
  status?: SessionStatusType;     // Documented API: SessionStatus ('Open', 'Closed', 'Cancelled')
  startedAt?: string | null;
  endedAt?: string | null;
  expectedClosingBalance?: number;
  variance?: number;
  totalIncome?: number;
  totalExpense?: number;
  items?: ShiftItemDto[];
  itemsCount?: number;

  // Additional financial / channel floats
  startVodafoneCash?: number;
  startInstapay?: number;
  startFawry?: number;
  vfCashInside?: number;
  vfCashOutside?: number;
  instapayInside?: number;
  instapayOutside?: number;
  fawryInside?: number;
  fawryOutside?: number;
  expectedCash?: number;
  canteenRevenue?: number;
  classroomRevenue?: number;
  workspaceRevenue?: number;
  packageRevenue?: number;
  otherIncome?: number;
  totalRevenue?: number;
  totalExpenses?: number;
  cashDifference?: number;
  transactionsCount?: number;
  vodafoneDifference?: number;
  instapayDifference?: number;
  fawryDifference?: number;
  increase?: number;
  loss?: number;
  totalCost?: number;
  administrative?: number;

  // Compatibility aliases
  date?: string | null;
  timeFrom?: string | null;
  timeTo?: string | null;
  previousTotal?: number;
  startTime?: string | null;
  endTime?: string | null;
  startCash?: number;
  endCash?: number;
  systemCash?: number;
  difference?: number;
  note?: string | null;
}

/** Full shift details with transaction ledger items */
export interface ShiftDetailDto extends ShiftDto {
  items: ShiftItemDto[];
  recalculatedAt?: string;
}

/** Create shift request — matches POST /api/shifts API specification */
export interface CreateShiftDto {
  userId?: string;              // Staff member Guid
  openingBalance?: number;      // Opening cash balance in drawer (e.g. 500.0)
  notes?: string;               // Optional opening remarks
  // Compatibility aliases
  previousTotal?: number;
  startCash?: number;
  date?: string;
  timeFrom?: string;
}

/** Close shift request — matches PUT /api/shifts/{id}/close API specification */
export interface CloseShiftDto {
  closingBalance: number;       // Actual closing cash balance in drawer (e.g. 750.0)
  notes?: string;               // Optional closing remarks
  // Compatibility aliases
  totalCost?: number;
  endCash?: number;
  note?: string;
  timeTo?: string;
  administrative?: number;
  vfCashInside?: number;
  vfCashOutside?: number;
  increase?: number;
  loss?: number;
  status?: number | string;
}

/** Alias for close shift request */
export type UpdateShiftDto = CloseShiftDto;

/** Shift transaction item response DTO */
export interface ShiftItemDto {
  id: string;
  description: string;          // Documented API: Description of the item
  amount: number;               // Documented API: Amount
  category: ShiftItemCategory;  // Documented API: 'Income' or 'Expense'
  shiftId?: string;
  createdAt?: string;
  // Compatibility aliases
  cost?: number;
  item?: string | null;
  type?: ShiftItemCategory | null;
  payWay?: number;              // 1=Cash, 2=Vodafone, 3=Instapay, 4=Fawry
}

/** Create shift item request — matches POST /api/shifts/{id}/items API specification */
export interface CreateShiftItemDto {
  description?: string;         // Documented API: e.g. "Tea / Coffee", "Cleaning supplies"
  amount?: number;              // Documented API: e.g. 50.0
  category?: ShiftItemCategory; // Documented API: "Income" or "Expense"
  // Compatibility aliases
  item?: string;
  cost?: number;
  type?: ShiftItemCategory;
  payWay?: number;
}

/** Verify Shift Password DTO for POST /api/shifts/{id}/verify-password or POST /api/shifts/verify-password */
export interface VerifyShiftPasswordDto {
  password: string;
  shiftId?: string;
  staffIdentifier?: string;
}

/** Shift filter query params for GET /api/shifts */
export interface ShiftFilterParams {
  userId?: string;
  status?: SessionStatusType;   // e.g. 'Open', 'Closed'
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

// ----- Legacy aliases for backward compatibility with existing code -----

/** @deprecated Use CreateShiftDto */
export type StartShiftDto = CreateShiftDto;

/** Legacy ShiftTransactionDto — maps to ShiftItemDto */
export interface ShiftTransactionDto extends ShiftItemDto {
  createdAt?: string;
}

/** Legacy BackendShiftDto — maps to ShiftDto */
export type BackendShiftDto = ShiftDto;
