/**
 * Shift API domain models matching Backend OpenAPI specifications.
 * Endpoints: POST /api/Shifts, GET /api/Shifts, GET /api/Shifts/open/{userId},
 *            PUT /api/Shifts/{id}/close, POST /api/Shifts/{id}/items
 *
 * SessionStatus enum: 1=Active, 2=Completed/Closed, 3=Scheduled, 4=Cancelled
 * PayWay enum: 1=Cash, 2=VodafoneCash, 3=InstaPay, 4=Fawry
 */

/** Shift response DTO from GET /api/Shifts and /api/Shifts/{id} */
export interface ShiftDto {
  id: string;
  date?: string | null;
  timeFrom?: string | null;
  timeTo?: string | null;
  administrative?: number;
  previousTotal?: number;   // Opening cash drawer balance
  vfCashInside?: number;
  vfCashOutside?: number;
  increase?: number;
  loss?: number;
  totalCost?: number;
  note?: string | null;
  status?: number;          // SessionStatus: 1=Active, 2=Completed
  userId?: string | null;
  userName?: string | null;
  items?: ShiftItemDto[];
  // Compatibility fallback helpers
  startTime?: string | null;
  endTime?: string | null;
  startCash?: number;
  endCash?: number;
  systemCash?: number;
  difference?: number;
  notes?: string | null;
}

/** Full shift details with transaction ledger items */
export interface ShiftDetailDto extends ShiftDto {
  items: ShiftItemDto[];
}

/** Create shift request — matches OpenAPI CreateShiftDto */
export interface CreateShiftDto {
  date?: string;            // ISO date-time
  timeFrom?: string;        // ISO date-time
  previousTotal?: number;   // Initial cash in drawer
  userId?: string;
  // Compatibility helpers
  startCash?: number;
  notes?: string;
}

/** Close/Update shift request — matches OpenAPI UpdateShiftDto */
export interface UpdateShiftDto {
  timeTo?: string;          // ISO date-time
  administrative?: number;
  vfCashInside?: number;
  vfCashOutside?: number;
  increase?: number;
  loss?: number;
  totalCost?: number;
  note?: string;
  status?: number;          // 2 = Completed
  // Compatibility helpers
  endCash?: number;
  notes?: string;
}

/** Alias for close shift request */
export type CloseShiftDto = UpdateShiftDto;

/** Structured Shift Item Category */
export type ShiftItemCategory =
  | 'canteen'
  | 'classroom'
  | 'workspace'
  | 'package'
  | 'expense';

/** Shift transaction item response DTO */
export interface ShiftItemDto {
  id: string;
  cost: number;
  type?: ShiftItemCategory | string | null;
  payWay?: number;          // PayWay enum: 1=Cash, 2=Vodafone, 3=Instapay, 4=Fawry
  item?: string | null;
  shiftId?: string;
  // Compatibility helpers
  amount?: number;
  description?: string;
  createdAt?: string;
}

/** Create shift item request — matches OpenAPI CreateShiftItemDto */
export interface CreateShiftItemDto {
  cost: number;
  type?: ShiftItemCategory | string;
  payWay?: number;          // PayWay: 1=Cash, 2=Vodafone, 3=Instapay, 4=Fawry
  item?: string;
  // Compatibility helpers
  amount?: number;
  description?: string;
}

/** Shift filter query params for GET /api/Shifts */
export interface ShiftFilterParams {
  userId?: string;
  status?: number;          // SessionStatus
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

// ----- Legacy aliases for backward compatibility with services -----

/** @deprecated Use CreateShiftDto */
export type StartShiftDto = CreateShiftDto;

/** Legacy ShiftTransactionDto — maps to ShiftItemDto */
export interface ShiftTransactionDto extends ShiftItemDto {
  createdAt?: string;
}

/** Legacy BackendShiftDto — maps to ShiftDto */
export type BackendShiftDto = ShiftDto;

