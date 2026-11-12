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

