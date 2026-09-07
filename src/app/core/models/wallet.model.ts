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

export enum WalletTransactionType {
  TopUp = 1,
  Deduct = 2,
  Refund = 3
}

export enum WalletTopUpRequestStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3
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
}

export interface CreateWalletDeductionDto {
  studentId: string;
  amount: number;
  note?: string | null;
}

export interface CreateWalletTopUpRequestDto {
  studentId: string;
  amount: number;
  proofImageUrl?: string | null;
  note?: string | null;
}

export interface WalletTopUpRequestDto {
  id: string;
  studentId: string;
  amount: number;
  proofImageUrl?: string | null;
  status: WalletTopUpRequestStatus;
  reviewedByAccountId?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface ReviewWalletTopUpRequestDto {
  approve: boolean;
  rejectionReason?: string | null;
}
