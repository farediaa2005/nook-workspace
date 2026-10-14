import { parseTimeToMinutes } from './date-time.util';

export interface ExistingReservationItem {
  id: string;
  reservationId?: string;
  seriesId?: string;
  occurrenceDate?: string;
  date?: string;
  fullDate?: string;
  startTime: string;
  endTime: string;
  roomId?: string;
  roomName?: string;
  classroom?: string;
  title?: string;
  activity?: string;
  instructor?: string;
  status?: string;
}

export interface ReservationCheckParams {
  roomId: string;
  roomName?: string;
  targetDates: string[];
  startTime: string;
  endTime: string;
  excludeReservationId?: string | null;
  existingReservations: ExistingReservationItem[];
}

export interface ReservationOverlapResult {
  hasConflict: boolean;
  conflictingItem?: ExistingReservationItem;
  conflictingDate?: string;
  reasonAr?: string;
  reasonEn?: string;
}

/**
 * Normalizes IDs to extract the underlying base UUID.
 * Handles occurrence formats (e.g. "uuid_2026-10-15") and display IDs ("RES-XXXX").
 */
export function extractBaseReservationId(rawId?: string | null): string {
  if (!rawId) return '';
  const trimmed = rawId.trim().toLowerCase();
  return trimmed.split('_')[0];
}

/**
 * Checks if an existing item matches the reservation being edited/extended.
 */
export function isSelfReservation(
  item: ExistingReservationItem,
  excludeId?: string | null
): boolean {
  if (!excludeId) return false;
  const cleanExclude = extractBaseReservationId(excludeId);
  if (!cleanExclude) return false;

  const itemIdBase = extractBaseReservationId(item.id);
  const itemResIdBase = extractBaseReservationId(item.reservationId);
  const itemSeriesIdBase = extractBaseReservationId(item.seriesId);

  if (itemIdBase && (itemIdBase === cleanExclude || cleanExclude.includes(itemIdBase) || itemIdBase.includes(cleanExclude))) {
    return true;
  }
  if (itemResIdBase && (itemResIdBase === cleanExclude || cleanExclude.includes(itemResIdBase) || itemResIdBase.includes(cleanExclude))) {
    return true;
  }
  if (itemSeriesIdBase && (itemSeriesIdBase === cleanExclude || cleanExclude.includes(itemSeriesIdBase) || itemSeriesIdBase.includes(cleanExclude))) {
    return true;
  }

  return false;
}

/**
 * Pure function to detect reservation conflicts.
 * Rules:
 * - Excludes the reservation being edited/extended by real base UUID, series ID, or occurrence ID.
 * - Touching boundaries (end == next start) are allowed (NO overlap).
 * - Only flags conflict if intervals strictly overlap: newStart < existingEnd && newEnd > existingStart.
 */
export function checkReservationOverlap(
  params: ReservationCheckParams
): ReservationOverlapResult {
  const {
    roomId,
    roomName,
    targetDates,
    startTime,
    endTime,
    excludeReservationId,
    existingReservations
  } = params;

  const newStart = parseTimeToMinutes(startTime);
  const newEnd = parseTimeToMinutes(endTime);

  if (newStart >= newEnd) {
    return { hasConflict: false };
  }

  const cleanRoomId = (roomId || '').trim().toLowerCase();
  const cleanRoomName = (roomName || '').trim().toLowerCase();

  const matchesRoom = (item: ExistingReservationItem): boolean => {
    const itemRoomId = (item.roomId || '').trim().toLowerCase();
    const itemRoomName = (item.roomName || item.classroom || '').trim().toLowerCase();
    if (cleanRoomId && itemRoomId && itemRoomId === cleanRoomId) return true;
    if (cleanRoomName && itemRoomName && (itemRoomName === cleanRoomName || itemRoomName.includes(cleanRoomName) || cleanRoomName.includes(itemRoomName))) return true;
    return false;
  };

  for (const date of targetDates) {
    for (const item of existingReservations) {
      // 1. Skip cancelled or completed sessions
      if (item.status === 'cancelled') continue;

      // 2. Skip self-reservation being edited or extended
      if (isSelfReservation(item, excludeReservationId)) continue;

      // 3. Room match check
      if (!matchesRoom(item)) continue;

      // 4. Date match check
      const itemDate = item.occurrenceDate || item.date || item.fullDate;
      if (!itemDate || !itemDate.startsWith(date)) continue;

      // 5. Time interval overlap check
      const exStart = parseTimeToMinutes(item.startTime);
      const exEnd = parseTimeToMinutes(item.endTime);
      if (exStart >= exEnd) continue;

      // Touching boundary allowed: [14:00, 16:00] and [16:00, 18:00] DO NOT overlap
      if (newStart < exEnd && newEnd > exStart) {
        const entityName = item.activity || item.title || item.instructor || 'حجز آخر';
        const timeRange = `${item.startTime} - ${item.endTime}`;
        return {
          hasConflict: true,
          conflictingItem: item,
          conflictingDate: date,
          reasonAr: `تعارض في الموعد: القاعة محجوزة بالفعل بتاريخ ${date} في الفترة (${timeRange}) لـ "${entityName}".`,
          reasonEn: `Time conflict: Room is already booked on ${date} from (${timeRange}) for "${entityName}".`
        };
      }
    }
  }

  return { hasConflict: false };
}
