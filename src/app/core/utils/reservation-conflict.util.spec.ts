import { describe, it, expect } from 'vitest';
import { checkReservationOverlap, isSelfReservation, extractBaseReservationId } from './reservation-conflict.util';

describe('Reservation Conflict & Overlap Util (NOOK-DEV-02)', () => {
  const existingList = [
    {
      id: 'res-uuid-1',
      reservationId: 'res-uuid-1',
      date: '2026-10-15',
      startTime: '14:00',
      endTime: '16:00',
      roomId: 'room-1',
      roomName: 'Workhive',
      title: 'Python Workshop'
    },
    {
      id: 'res-uuid-2',
      reservationId: 'res-uuid-2',
      date: '2026-10-15',
      startTime: '17:00',
      endTime: '19:00',
      roomId: 'room-1',
      roomName: 'Workhive',
      title: 'Design Workshop'
    },
    {
      id: 'res-uuid-3_2026-10-15',
      reservationId: 'res-uuid-3',
      occurrenceDate: '2026-10-15',
      date: '2026-10-15',
      startTime: '10:00',
      endTime: '12:00',
      roomId: 'room-2',
      roomName: 'Meeting Room',
      title: 'Accounting Series'
    }
  ];

  it('should allow extending a 2-hour reservation (14:00-16:00) to 17:00 without self-conflict', () => {
    const result = checkReservationOverlap({
      roomId: 'room-1',
      roomName: 'Workhive',
      targetDates: ['2026-10-15'],
      startTime: '14:00',
      endTime: '17:00',
      excludeReservationId: 'res-uuid-1', // Extending self!
      existingReservations: existingList
    });

    expect(result.hasConflict).toBe(false);
  });

  it('should block extension if it overlaps with a DIFFERENT reservation (16:30-18:00)', () => {
    // res-uuid-2 is 17:00-19:00, so extending to 17:30 conflicts with res-uuid-2
    const result = checkReservationOverlap({
      roomId: 'room-1',
      roomName: 'Workhive',
      targetDates: ['2026-10-15'],
      startTime: '14:00',
      endTime: '17:30',
      excludeReservationId: 'res-uuid-1',
      existingReservations: existingList
    });

    expect(result.hasConflict).toBe(true);
    expect(result.conflictingItem?.id).toBe('res-uuid-2');
  });

  it('should allow touching boundaries (end == next start, e.g. 16:00 to 17:00)', () => {
    // res-uuid-1 ends at 16:00, res-uuid-2 starts at 17:00
    // A new reservation 16:00 to 17:00 touches both boundaries but should NOT conflict
    const result = checkReservationOverlap({
      roomId: 'room-1',
      roomName: 'Workhive',
      targetDates: ['2026-10-15'],
      startTime: '16:00',
      endTime: '17:00',
      excludeReservationId: null,
      existingReservations: existingList
    });

    expect(result.hasConflict).toBe(false);
  });

  it('should allow overlapping times in a DIFFERENT room', () => {
    // 14:00-16:00 in room-2 while room-1 is booked
    const result = checkReservationOverlap({
      roomId: 'room-2',
      roomName: 'Meeting Room',
      targetDates: ['2026-10-15'],
      startTime: '14:00',
      endTime: '16:00',
      excludeReservationId: null,
      existingReservations: existingList
    });

    expect(result.hasConflict).toBe(false);
  });

  it('should properly exclude recurring series occurrences by base UUID', () => {
    const isSelf = isSelfReservation(
      {
        id: 'res-uuid-3_2026-10-15',
        reservationId: 'res-uuid-3',
        startTime: '10:00',
        endTime: '12:00'
      },
      'res-uuid-3'
    );

    expect(isSelf).toBe(true);
  });
});
