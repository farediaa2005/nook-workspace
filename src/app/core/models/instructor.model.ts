/**
 * Instructor domain models matching Backend OpenAPI 3.0.4 specifications.
 * Endpoints: GET/POST /api/Instructors, GET/PUT/DELETE /api/Instructors/{id}
 */

export interface InstructorDto {
  id: string;
  name: string;
  phoneNumber?: string | null;
  colour?: string | null;
  // UI and backward compatibility fields
  nameEn?: string;
  phone?: string;
  email?: string;
  specialty?: string;
  bio?: string;
  imageUrl?: string;
  isActive?: boolean;
  sessionsCount?: number;
  totalRevenue?: number;
  createdAt?: string;
}

export interface CreateInstructorDto {
  name: string;
  phoneNumber?: string | null;
  colour?: string | null;
  // UI and backward compatibility fields
  nameEn?: string;
  phone?: string;
  email?: string;
  specialty?: string;
  bio?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface UpdateInstructorDto {
  name: string;
  phoneNumber?: string | null;
  colour?: string | null;
  // UI and backward compatibility fields
  nameEn?: string;
  phone?: string;
  email?: string;
  specialty?: string;
  bio?: string;
  imageUrl?: string;
  isActive?: boolean;
}

/** Instructor activity for analytics — GET /api/Analysis/instructor-activity */
export interface InstructorActivityDto {
  instructorId: string;
  instructorName: string;
  totalSessions: number;
  totalHours: number;
  totalRevenue: number;
  // UI compatibility aliases
  sessionsCount?: number;
}

