import { describe, it, expect } from 'vitest';
import { checkReservationOverlap, isSelfReservation, extractBaseReservationId, getTimeSegments } from './reservation-conflict.util';

describe('Reservation Conflict & Overlap Util (NOOK-DEV-02, CR-01)', () => {
  const existingList = [
    {
      id: 'res-uuid-1',
      reservationId: 'res-uuid-1',
      date: '2026-10-15',
      startTime: '14:00',
      endTime: '16:00',
      roomId: 'room-1',
      roomName: 'Workhive',
      title: 'Python Workshop',
      status: 'active'
    },
    {
      id: 'res-uuid-2',
      reservationId: 'res-uuid-2',
      date: '2026-10-15',
      startTime: '17:00',
      endTime: '19:00',
      roomId: 'room-1',
      roomName: 'Workhive',
      title: 'Design Workshop',
      status: 'active'
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
      title: 'Accounting Series',
      status: 'confirmed'
    },
    {
      id: 'res-cancelled',
      reservationId: 'res-cancelled',
      date: '2026-10-15',
      startTime: '12:00',
      endTime: '14:00',
      roomId: 'room-1',
      roomName: 'Workhive',
      title: 'Cancelled Workshop',
      status: 'cancelled'
    },
    {
      id: 'res-completed',
      reservationId: 'res-completed',
      date: '2026-10-15',
      startTime: '08:00',
      endTime: '10:00',
      roomId: 'room-1',
      roomName: 'Workhive',
      title: 'Morning Completed Session',
      status: 'completed'
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

  it('should allow creating a reservation in the same room on a DIFFERENT date', () => {
    // Exactly same time slot 14:00-16:00 in room-1 on tomorrow (2026-10-16)
    const result = checkReservationOverlap({
      roomId: 'room-1',
      roomName: 'Workhive',
      targetDates: ['2026-10-16'],
      startTime: '14:00',
      endTime: '16:00',
      excludeReservationId: null,
      existingReservations: existingList
    });

    expect(result.hasConflict).toBe(false);
  });

  it('should allow booking over cancelled and completed sessions', () => {
    // res-cancelled is 12:00-14:00 in room-1
    const resultCancelled = checkReservationOverlap({
      roomId: 'room-1',
      roomName: 'Workhive',
      targetDates: ['2026-10-15'],
      startTime: '12:00',
      endTime: '14:00',
      excludeReservationId: null,
      existingReservations: existingList
    });
    expect(resultCancelled.hasConflict).toBe(false);

    // res-completed is 08:00-10:00 in room-1
    const resultCompleted = checkReservationOverlap({
      roomId: 'room-1',
      roomName: 'Workhive',
      targetDates: ['2026-10-15'],
      startTime: '08:00',
      endTime: '10:00',
      excludeReservationId: null,
      existingReservations: existingList
    });
    expect(resultCompleted.hasConflict).toBe(false);
  });

  it('should accurately handle midnight crossover intervals', () => {
    const midnightList = [
      {
        id: 'res-night-1',
        date: '2026-10-15',
        startTime: '22:00',
        endTime: '02:00', // crosses into 2026-10-16
        roomId: 'room-night',
        roomName: 'Night Space',
        status: 'active'
      }
    ];

    // Conflict on first night segment (23:00 to 01:00)
    const result1 = checkReservationOverlap({
      roomId: 'room-night',
      targetDates: ['2026-10-15'],
      startTime: '23:00',
      endTime: '01:00',
      existingReservations: midnightList
    });
    expect(result1.hasConflict).toBe(true);

    // Conflict on next day morning segment (01:00 to 03:00 on 2026-10-16)
    const result2 = checkReservationOverlap({
      roomId: 'room-night',
      targetDates: ['2026-10-16'],
      startTime: '01:00',
      endTime: '03:00',
      existingReservations: midnightList
    });
    expect(result2.hasConflict).toBe(true);

    // Touching boundary on next day (02:00 to 04:00 on 2026-10-16) - NO conflict
    const result3 = checkReservationOverlap({
      roomId: 'room-night',
      targetDates: ['2026-10-16'],
      startTime: '02:00',
      endTime: '04:00',
      existingReservations: midnightList
    });
    expect(result3.hasConflict).toBe(false);
  });
});
