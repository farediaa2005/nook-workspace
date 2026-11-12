/**
 * Domain and DTO models for Student Wallet operations matching OpenAPI 3.0.4.
 * Endpoints: GET /api/Wallet/student/{studentId}/balance,
 *            GET /api/Wallet/student/{studentId}/transactions,
 *            POST /api/Wallet/topup/direct,
 *            POST /api/Wallet/deduct,
 *            POST /api/Wallet/topup/request,
 *            GET /api/Wallet/topup/requests,
 *            GET /api/Wallet/topup/requests/{id},
 *            PUT /api/Wallet/topup/requests/{id}/review
 */

enum WalletTransactionType {
  TopUp = 1,
  Deduct = 2,
  Refund = 3
}

export interface WalletBalanceDto {
  studentId: string;
  balance: number;
}

export interface WalletTransactionDto {
  id: string;
  studentId: string;
  amount: number;
  type: WalletTransactionType;
  note?: string | null;
  topUpRequestId?: string | null;
  performedByAccountId?: string | null;
  createdAt: string;
}

export interface CreateDirectTopUpDto {
  studentId: string;
  amount: number;
  note?: string | null;
  /** How the money came in (1 Cash, 2 Vodafone, 3 InstaPay, 4 Fawry); counted in that shift channel. */
  payWay?: number;
}

export interface CreateWalletDeductionDto {
  studentId: string;
  amount: number;
  note?: string | null;
}
