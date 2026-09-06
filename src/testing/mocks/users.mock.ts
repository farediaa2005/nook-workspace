// [MOCK DATA FOR TESTING / PRESENTATION ONLY]
// This file contains offline mock datasets for User Management.
// In runtime mode, the application is strictly connected to live API endpoints.

export interface MockUser {
  id: string;
  name: string;
  nameAr?: string;
  username: string;
  phone: string;
  email: string;
  role: 'Admin / Manager' | 'Receptionist' | string;
  roleAr?: string;
  status: 'active' | 'inactive' | string;
  createdAt?: string;
  password?: string;
}

export const USE_USERS_MOCK_DATA = false;

export const MOCK_USERS: MockUser[] = [
  {
    id: 'USR-01',
    name: 'أحمد محمود',
    nameAr: 'أحمد محمود',
    username: 'ahmed_admin',
    phone: '01012345678',
    email: 'ahmed.admin@nook.io',
    role: 'Admin / Manager',
    roleAr: 'مسؤول / مدير',
    status: 'active',
    createdAt: '2026-01-15'
  },
  {
    id: 'USR-02',
    name: 'سارة إبراهيم',
    nameAr: 'سارة إبراهيم',
    username: 'sara_reception',
    phone: '01123456789',
    email: 'sara.rec@nook.io',
    role: 'Receptionist',
    roleAr: 'موظف استقبال',
    status: 'active',
    createdAt: '2026-02-10'
  },
  {
    id: 'USR-03',
    name: 'محمد علي',
    nameAr: 'محمد علي',
    username: 'mohamed_reception',
    phone: '01234567890',
    email: 'mohamed.rec@nook.io',
    role: 'Receptionist',
    roleAr: 'موظف استقبال',
    status: 'active',
    createdAt: '2026-03-01'
  }
];
