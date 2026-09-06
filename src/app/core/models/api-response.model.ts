/**
 * Generic API response wrappers.
 * Matches backend's ApiResponse<T> and PaginatedResult<T> envelope pattern.
 *
 * Backend envelope:
 *   { isSuccess: boolean, data: T, message?: string, errors?: string[] }
 */

/** Standard backend response envelope — wraps all API responses */
export interface ApiResponse<T> {
  isSuccess: boolean;
  success?: boolean;
  data: T;
  message?: string;
  errors?: string[] | null;
}

/** Paginated list data from the backend */
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/** Combined paginated API response */
export type PaginatedApiResponse<T> = ApiResponse<PaginatedResult<T>>;

/** Standard error response */
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  errors?: string[];
}

/** Helper: extract data from ApiResponse */
export function extractData<T>(response: ApiResponse<T>): T {
  if (response === null || response === undefined) {
    return response as unknown as T;
  }
  if (typeof response === 'object' && 'data' in response && response.data !== undefined) {
    return response.data;
  }
  return response as unknown as T;
}

/** Helper: extract items from paginated ApiResponse */
export function extractItems<T>(response: PaginatedApiResponse<T>): T[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  return response.data?.items ?? (response as any).items ?? [];
}
