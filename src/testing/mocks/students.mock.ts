import { ActiveStudentSession } from '../../app/core/models/student.model';

export interface MockStudent {
  id: string;
  name: string;
  phone: string;
  college: string;
  planType: string;
  status: 'active' | 'completed';
  joinedDate: string;
}

export const MOCK_STUDENTS: MockStudent[] = [
  {
    id: 'STU-001',
    name: 'Ahmed Mahmoud',
    phone: '01012345678',
    college: 'Engineering',
    planType: 'Standard Package',
    status: 'active',
    joinedDate: '2024-09-15',
  },
  {
    id: 'STU-002',
    name: 'Sarah Ali',
    phone: '01098765432',
    college: 'Medicine',
    planType: 'Monthly Pass',
    status: 'active',
    joinedDate: '2024-10-01',
  },
  {
    id: 'STU-003',
    name: 'Mostafa Hassan',
    phone: '01155566677',
    college: 'Computer Science',
    planType: 'Hourly Rate',
    status: 'active',
    joinedDate: '2024-10-10',
  },
];

export const MOCK_ACTIVE_STUDENT_SESSIONS: ActiveStudentSession[] = [
  {
    id: 'STU-101',
    name: 'Omar Khaled',
    phone: '01012345678',
    email: 'omar.khaled@nu.edu.eg',
    faculty: 'Computer Engineering',
    college: 'Faculty of Engineering',
    billingType: 'new-session',
    date: '2026-09-01',
    checkInTime: '01:15 PM',
    duration: '2h 15m',
    cost: 35,
    status: 'active'
  },
  {
    id: 'STU-102',
    name: 'Mariam Said',
    phone: '01123456789',
    email: 'mariam.said@nu.edu.eg',
    faculty: 'Faculty of Medicine',
    college: 'Medicine & Surgery',
    billingType: 'new-session',
    date: '2026-09-01',
    checkInTime: '01:45 PM',
    duration: '1h 45m',
    cost: 30,
    status: 'active'
  },
  {
    id: 'STU-103',
    name: 'Youssef Ali',
    phone: '01234567890',
    email: 'youssef.ali@nu.edu.eg',
    faculty: 'Applied Arts',
    college: 'Arts & Design',
    billingType: 'new-session',
    date: '2026-09-01',
    checkInTime: '02:10 PM',
    duration: '1h 20m',
    cost: 25,
    status: 'active'
  },
  {
    id: 'STU-104',
    name: 'Salma Tarek',
    phone: '01545678901',
    email: 'salma.tarek@nu.edu.eg',
    faculty: 'Business Administration',
    college: 'Management Sciences',
    billingType: 'new-session',
    date: '2026-09-01',
    checkInTime: '02:30 PM',
    duration: '1h 00m',
    cost: 20,
    status: 'active'
  }
];
