import { ClassroomCard } from '../../app/core/models/classroom.model';

export type { ClassroomCard };

// Helper to get today's date formatted as YYYY-MM-DD
const getTodayISO = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Initial mock data seed for Classroom Live Board.
 * Connects directly with the reservations calendar.
 */
export const MOCK_CLASSROOM_CARDS: ClassroomCard[] = [
  {
    id: 'res-001',
    name: 'Nook 1',
    activity: 'IELTS Prep',
    instructor: 'Dr. Hana Adel',
    status: 'active',
    image: '/images/rooms/room-design.jpg',
    colorTheme: 'brown', // Yellow theme
    accentColor: '#f5b921',
    hourlyRate: 50.00,
    printingCharges: 0.00,
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    bookingDate: getTodayISO(),
    durationHours: 2,
    elapsed: '1h 30m elapsed',
    rental: 250.00,
    catering: 0.00
  },
  {
    id: 'res-002',
    name: 'Studio A',
    activity: 'GMAT Course',
    instructor: 'Mr. Tarek Nabil',
    status: 'scheduled',
    image: '/images/rooms/room-studio.jpg',
    colorTheme: 'purple', // Purple theme
    accentColor: '#7c3aed',
    hourlyRate: 60.00,
    printingCharges: 0.00,
    startTime: '02:00 PM',
    endTime: '05:00 PM',
    bookingDate: getTodayISO(),
    durationHours: 3,
    elapsed: '3h session',
    rental: 450.00,
    catering: 0.00
  },
  {
    id: 'res-003',
    name: 'Nook 3',
    activity: 'SAT Workshop',
    instructor: 'Ms. Dina Farouk',
    status: 'active',
    image: '/images/rooms/room-design.jpg',
    colorTheme: 'orange', // Orange theme
    accentColor: '#f97316',
    hourlyRate: 50.00,
    printingCharges: 0.00,
    startTime: '09:00 AM',
    endTime: '11:30 AM',
    bookingDate: getTodayISO(),
    durationHours: 2.5,
    elapsed: '1h 45m elapsed',
    rental: 300.00,
    catering: 0.00
  },
  {
    id: 'res-004',
    name: 'Lab A',
    activity: 'GRE Prep',
    instructor: 'Dr. Amr Rashid',
    status: 'active',
    image: '/images/rooms/room-studio.jpg',
    colorTheme: 'rose', // Rose theme
    accentColor: '#ec4899',
    hourlyRate: 60.00,
    printingCharges: 0.00,
    startTime: '11:00 AM',
    endTime: '01:00 PM',
    bookingDate: getTodayISO(),
    durationHours: 2,
    elapsed: '1h 00m elapsed',
    rental: 280.00,
    catering: 0.00
  },
  {
    id: 'res-005',
    name: 'Nook 2',
    activity: 'TOEFL Intensive',
    instructor: 'Prof. Sara Nour',
    status: 'active',
    image: '/images/rooms/room-workshop.jpg',
    colorTheme: 'blue', // Blue theme
    accentColor: '#3b82f6',
    hourlyRate: 75.00,
    printingCharges: 0.00,
    startTime: '09:00 AM',
    endTime: '12:00 PM',
    bookingDate: getTodayISO(),
    durationHours: 3,
    elapsed: '2h 30m elapsed',
    rental: 380.00,
    catering: 0.00
  },
  {
    id: 'res-006',
    name: 'Innovation Hub',
    activity: 'ACT Prep',
    instructor: 'Mr. Khaled Sherif',
    status: 'scheduled',
    image: '/images/rooms/room-workshop.jpg',
    colorTheme: 'emerald', // Emerald theme
    accentColor: '#10b981',
    hourlyRate: 80.00,
    printingCharges: 0.00,
    startTime: '01:00 PM',
    endTime: '04:00 PM',
    bookingDate: getTodayISO(),
    durationHours: 3,
    elapsed: '3h session',
    rental: 350.00,
    catering: 0.00
  },
  {
    id: 'res-007',
    name: 'Nook 1',
    activity: 'Web Dev BootCamp',
    instructor: 'Eng. Omar Khaled',
    status: 'scheduled',
    image: '/images/rooms/room-design.jpg',
    colorTheme: 'brown', // Yellow theme
    accentColor: '#f5b921',
    hourlyRate: 50.00,
    printingCharges: 0.00,
    startTime: '03:00 PM',
    endTime: '06:00 PM',
    bookingDate: getTodayISO(),
    durationHours: 3,
    elapsed: '3h session',
    rental: 420.00,
    catering: 0.00
  },
  {
    id: 'res-008',
    name: 'Nook 2',
    activity: 'Python AI Workshop',
    instructor: 'Dr. Youssef Ali',
    status: 'scheduled',
    image: '/images/rooms/room-workshop.jpg',
    colorTheme: 'blue', // Blue theme
    accentColor: '#3b82f6',
    hourlyRate: 75.00,
    printingCharges: 0.00,
    startTime: '05:00 PM',
    endTime: '08:00 PM',
    bookingDate: getTodayISO(),
    durationHours: 3,
    elapsed: '3h session',
    rental: 500.00,
    catering: 0.00
  },
  {
    id: 'res-009',
    name: 'Studio A',
    activity: 'UI/UX Masterclass',
    instructor: 'Ms. Nouran Samir',
    status: 'scheduled',
    image: '/images/rooms/room-studio.jpg',
    colorTheme: 'purple', // Purple theme
    accentColor: '#7c3aed',
    hourlyRate: 60.00,
    printingCharges: 0.00,
    startTime: '06:30 PM',
    endTime: '09:30 PM',
    bookingDate: getTodayISO(),
    durationHours: 3,
    elapsed: '3h session',
    rental: 460.00,
    catering: 0.00
  },
  {
    id: 'res-010',
    name: 'Nook 3',
    activity: 'Business English Night',
    instructor: 'Mr. Karim Fawzy',
    status: 'scheduled',
    image: '/images/rooms/room-design.jpg',
    colorTheme: 'orange', // Orange theme
    accentColor: '#f97316',
    hourlyRate: 50.00,
    printingCharges: 0.00,
    startTime: '07:00 PM',
    endTime: '10:00 PM',
    bookingDate: getTodayISO(),
    durationHours: 3,
    elapsed: '3h session',
    rental: 390.00,
    catering: 0.00
  }
];
