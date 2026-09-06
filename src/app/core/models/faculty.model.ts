/**
 * Faculty (College) domain models matching Backend OpenAPI 3.0.4 specifications.
 * Endpoints: GET/POST /api/Faculties, GET/PUT/DELETE /api/Faculties/{id}
 */

export interface FacultyDto {
  id: string;
  name: string;
  // UI and backward compatibility fields
  nameEn?: string;
  code?: string;
  isActive?: boolean;
  studentCount?: number;
  createdAt?: string;
}

export interface CreateFacultyDto {
  name: string;
  // UI and backward compatibility fields
  nameEn?: string;
  code?: string;
  isActive?: boolean;
}

export interface UpdateFacultyDto {
  name: string;
  // UI and backward compatibility fields
  nameEn?: string;
  code?: string;
  isActive?: boolean;
}

