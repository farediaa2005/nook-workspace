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
 * Pure function to split a time range into calendar day segments, accurately handling midnight crossover.
 */
export function getTimeSegments(dateISO: string, startT: string, endT: string): { date: string; start: number; end: number }[] {
  const s = parseTimeToMinutes(startT);
  const e = parseTimeToMinutes(endT);
  if (s === e) return [];
  const cleanDate = dateISO.split('T')[0];
  if (e < s) {
    const [y, m, d] = cleanDate.split('-').map(Number);
    const nextDayObj = new Date(y, m - 1, d + 1);
    const ny = nextDayObj.getFullYear();
    const nm = String(nextDayObj.getMonth() + 1).padStart(2, '0');
    const nd = String(nextDayObj.getDate()).padStart(2, '0');
    const nextDayISO = `${ny}-${nm}-${nd}`;
    return [
      { date: cleanDate, start: s, end: 1440 },
      { date: nextDayISO, start: 0, end: e }
    ];
  }
  return [{ date: cleanDate, start: s, end: e }];
}

/**
 * Pure function to detect reservation conflicts.
 * Rules:
 * - Excludes the reservation being edited/extended by real base UUID, series ID, or occurrence ID.
 * - Touching boundaries (end == next start) are allowed (NO overlap).
 * - Only flags conflict if intervals strictly overlap: newStart < existingEnd && newEnd > existingStart.
 * - Supports midnight crossover intervals via segmented day comparison.
 * - Excludes cancelled, completed, and available non-blocking sessions.
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

  if (newStart === newEnd) {
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

  const nonBlockingStatuses = ['cancelled', 'canceled', 'available', 'completed'];

  for (const rawDate of targetDates) {
    const targetDate = rawDate.split('T')[0];
    const proposedSegments = getTimeSegments(targetDate, startTime, endTime);
    if (proposedSegments.length === 0) continue;

    for (const item of existingReservations) {
      // 1. Skip cancelled, completed, or available non-blocking sessions
      if (item.status && nonBlockingStatuses.includes(item.status.trim().toLowerCase())) continue;

      // 2. Skip self-reservation being edited or extended
      if (isSelfReservation(item, excludeReservationId)) continue;

      // 3. Room match check
      if (!matchesRoom(item)) continue;

      // 4. Date and time segments
      const rawItemDate = item.occurrenceDate || item.date || item.fullDate;
      if (!rawItemDate) continue;
      const itemDate = rawItemDate.split('T')[0];

      const itemSegments = getTimeSegments(itemDate, item.startTime, item.endTime);
      if (itemSegments.length === 0) continue;

      // Half-open interval intersection check: [start, end)
      // Touching boundary allowed: e.g. [14:00, 16:00) and [16:00, 18:00) do NOT overlap.
      for (const pSeg of proposedSegments) {
        for (const iSeg of itemSegments) {
          if (pSeg.date === iSeg.date && pSeg.start < iSeg.end && pSeg.end > iSeg.start) {
            const entityName = item.activity || item.title || item.instructor || 'حجز آخر';
            const timeRange = `${item.startTime} - ${item.endTime}`;
            return {
              hasConflict: true,
              conflictingItem: item,
              conflictingDate: targetDate,
              reasonAr: `تعارض في الموعد: القاعة محجوزة بالفعل بتاريخ ${pSeg.date} في الفترة (${timeRange}) لـ "${entityName}".`,
              reasonEn: `Time conflict: Room is already booked on ${pSeg.date} from (${timeRange}) for "${entityName}".`
            };
          }
        }
      }
    }
  }

  return { hasConflict: false };
}
