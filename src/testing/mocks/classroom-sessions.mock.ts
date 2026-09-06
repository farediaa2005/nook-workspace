/**
 * Mock classroom session data for development and testing.
 * Extracted from ClassroomCheckoutComponent.
 * TODO: Remove when real API is connected.
 */

export interface MockRoomSession {
  id: string;
  room: string;
  host: string;
  startTime: string;
  duration: string;
  catering: number;
  total: number;
}

export const MOCK_ROOM_SESSIONS: MockRoomSession[] = [
  { id: 'RM-SESS-01', room: 'Innovation Hall A', host: 'Dr. Mahmoud El-Sayed', startTime: '12:00', duration: '4 hrs', catering: 250, total: 1050 },
  { id: 'RM-SESS-02', room: 'Workshop Room B', host: 'Eng. Reem Nabil', startTime: '15:30', duration: '2 hrs 30 mins', catering: 120, total: 495 },
];
