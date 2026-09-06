/**
 * Mock session data for development and testing.
 * Extracted from WorkspaceCheckoutComponent.
 * TODO: Remove when real API is connected.
 */

export interface MockSession {
  id: string;
  student: string;
  room: string;
  checkin: string;
  duration: string;
  total: number;
}

export const MOCK_ACTIVE_SESSIONS: MockSession[] = [
  { id: 'SESS-201', student: 'Ahmed Mahmoud', room: 'Desk #12 (Quiet Zone)', checkin: '14:30', duration: '3 hrs 15 mins', total: 65 },
  { id: 'SESS-202', student: 'Sarah Ali', room: 'Desk #04 (Shared)', checkin: '15:00', duration: '2 hrs 45 mins', total: 55 },
  { id: 'SESS-203', student: 'Mostafa Hassan', room: 'Private Booth #2', checkin: '16:15', duration: '1 hr 30 mins', total: 45 },
];
