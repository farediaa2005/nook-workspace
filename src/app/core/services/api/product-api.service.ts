import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';

export interface BackendProductDto {
  id: string;
  name: string;
  imageUrl?: string | null;
  serialNo?: string | null;
  piecePrice: number;
  quantity: number;
  cost: number;
  restockDate?: string | null;
  expireDate?: string | null;
}

export interface CreateProductPayload {
  Name: string;
  ImageUrl?: string;
  SerialNo?: string;
  PiecePrice: number;
  Quantity: number;
  Cost: number;
  RestockDate?: string;
  ExpireDate?: string;
}

export interface UpdateProductPayload {
  Name?: string;
  ImageUrl?: string;
  SerialNo?: string;
  PiecePrice?: number;
  Quantity?: number;
  Cost?: number;
  RestockDate?: string;
  ExpireDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductApiService extends BaseApiService {
  /** Get list of products */
  getProducts(): Observable<BackendProductDto[]> {
    return this.get<ApiResponse<BackendProductDto[] | { items: BackendProductDto[] }>>(
      API_ENDPOINTS.PRODUCTS.LIST
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: BackendProductDto[] })?.items ?? [];
      })
    );
  }

  /** Get product by ID */
  getProductById(id: string): Observable<BackendProductDto> {
    return this.get<ApiResponse<BackendProductDto>>(API_ENDPOINTS.PRODUCTS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Create product via JSON or FormData */
  createProduct(payload: CreateProductPayload | FormData): Observable<BackendProductDto> {
    return this.post<ApiResponse<BackendProductDto>>(API_ENDPOINTS.PRODUCTS.LIST, payload).pipe(
      map(extractData)
    );
  }

  /** Update product */
  updateProduct(id: string, payload: UpdateProductPayload | FormData): Observable<BackendProductDto> {
    return this.put<ApiResponse<BackendProductDto>>(API_ENDPOINTS.PRODUCTS.BY_ID(id), payload).pipe(
      map(extractData)
    );
  }

  /** Delete product */
  deleteProduct(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.PRODUCTS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Upload product image */
  uploadProductImage(id: string, file: File): Observable<boolean> {
    const formData = new FormData();
    formData.append('imageFile', file);
    return this.post<ApiResponse<boolean>>(API_ENDPOINTS.PRODUCTS.IMAGE(id), formData).pipe(
      map(extractData)
    );
  }
}
