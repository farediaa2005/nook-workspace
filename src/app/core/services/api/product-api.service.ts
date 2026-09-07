import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import { ProductDto, CreateProductDto, UpdateProductDto } from '../../models/catering.model';

export type { ProductDto, CreateProductDto, UpdateProductDto };
export type BackendProductDto = ProductDto;
export type CreateProductPayload = CreateProductDto;
export type UpdateProductPayload = UpdateProductDto;

/**
 * 3️⃣ Product API Service (Layer 3: [3. API Service])
 * Responsible for pure HTTP requests with the backend API via BaseApiService.
 */
@Injectable({
  providedIn: 'root'
})
export class ProductApiService extends BaseApiService {
  /** Get list of products (GET /api/Products) */
  getProducts(): Observable<ProductDto[]> {
    return this.get<ApiResponse<ProductDto[] | { items: ProductDto[] }> | ProductDto[]>(
      API_ENDPOINTS.PRODUCTS.LIST
    ).pipe(
      map(res => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: ProductDto[] })?.items ?? [];
      })
    );
  }

  /** Get product by ID (GET /api/Products/{id}) */
  getProductById(id: string): Observable<ProductDto> {
    return this.get<ApiResponse<ProductDto>>(API_ENDPOINTS.PRODUCTS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Create product via JSON or FormData (POST /api/Products) */
  createProduct(payload: CreateProductDto | FormData): Observable<ProductDto> {
    return this.post<ApiResponse<ProductDto>>(API_ENDPOINTS.PRODUCTS.LIST, payload).pipe(
      map(extractData)
    );
  }

  /** Update product (PUT /api/Products/{id}) */
  updateProduct(id: string, payload: UpdateProductDto | FormData): Observable<ProductDto> {
    return this.put<ApiResponse<ProductDto>>(API_ENDPOINTS.PRODUCTS.BY_ID(id), payload).pipe(
      map(extractData)
    );
  }

  /** Delete product (DELETE /api/Products/{id}) */
  deleteProduct(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.PRODUCTS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Upload product image (POST /api/Products/{id}/image) */
  uploadProductImage(id: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('imageFile', file, file.name);
    formData.append('file', file, file.name);
    formData.append('image', file, file.name);
    formData.append('Image', file, file.name);
    return this.post<any>(API_ENDPOINTS.PRODUCTS.IMAGE(id), formData).pipe(
      map(res => {
        if (!res) return null;
        if (typeof res === 'string') return res;
        if (res.data) return res.data;
        return res;
      })
    );
  }
}
