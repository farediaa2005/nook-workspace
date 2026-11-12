import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import { WalletBalanceDto, WalletTransactionDto, CreateDirectTopUpDto, CreateWalletDeductionDto } from '../../models/wallet.model';

@Injectable({
  providedIn: 'root'
})
export class WalletApiService extends BaseApiService {
  /** Get student wallet balance — GET /api/Wallet/student/{studentId}/balance */
  getBalance(studentId: string): Observable<WalletBalanceDto> {
    return this.get<ApiResponse<WalletBalanceDto>>(
      API_ENDPOINTS.WALLET.BALANCE(studentId)
    ).pipe(map(extractData));
  }

  /** Get student wallet transactions history — GET /api/Wallet/student/{studentId}/transactions */
  getTransactions(studentId: string): Observable<WalletTransactionDto[]> {
    return this.get<ApiResponse<WalletTransactionDto[] | { items: WalletTransactionDto[] }>>(
      API_ENDPOINTS.WALLET.TRANSACTIONS(studentId)
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: WalletTransactionDto[] })?.items ?? [];
      })
    );
  }

  /** Direct top-up performed by staff/admin — POST /api/Wallet/topup/direct */
  topUpDirect(dto: CreateDirectTopUpDto): Observable<WalletTransactionDto> {
    return this.post<ApiResponse<WalletTransactionDto>>(
      API_ENDPOINTS.WALLET.TOPUP_DIRECT,
      dto
    ).pipe(map(extractData));
  }

  /** Deduct amount from student wallet (e.g. checkout payment) — POST /api/Wallet/deduct */
  deduct(dto: CreateWalletDeductionDto): Observable<WalletTransactionDto> {
    return this.post<ApiResponse<WalletTransactionDto>>(
      API_ENDPOINTS.WALLET.DEDUCT,
      dto
    ).pipe(map(extractData));
  }
}
