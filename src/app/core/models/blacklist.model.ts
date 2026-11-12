
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

