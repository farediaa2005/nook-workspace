/**
 * Blacklist domain models matching Backend OpenAPI 3.0.4 specifications.
 * Endpoints: GET/POST /api/Blacklists, GET/PUT/DELETE /api/Blacklists/{id}
 */

export type BlacklistReason = 'Damage' | 'NonPayment' | 'Misconduct' | 'Other';

/** Blacklist DTO from GET /api/Blacklists */
export interface BlacklistDto {
  id: string;
  name: string;
  reason?: string | null;
  blacklistedAt?: string | null;
  studentId?: string | null;
  // UI and backward compatibility fields
  studentName?: string;
  studentPhone?: string;
  studentEmail?: string;
  reasonDetails?: string;
  blockedAt?: string;
  blockedBy?: string;
  isActive?: boolean;
  notes?: string;
}

/** Create Blacklist request — POST /api/Blacklists */
export interface CreateBlacklistDto {
  name: string;
  reason?: string | null;
  blacklistedAt?: string | null;
  studentId?: string | null;
  // UI and backward compatibility fields
  studentName?: string;
  studentPhone?: string;
  studentEmail?: string;
  reasonDetails?: string;
  notes?: string;
}

/** Update Blacklist request — PUT /api/Blacklists/{id} */
export interface UpdateBlacklistDto {
  name: string;
  reason?: string | null;
  blacklistedAt?: string | null;
  studentId?: string | null;
  // UI and backward compatibility fields
  reasonDetails?: string;
  isActive?: boolean;
  notes?: string;
}

