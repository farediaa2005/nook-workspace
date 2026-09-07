/**
 * API endpoint configuration.
 * Centralized endpoint URLs for all backend communication.
 *
 * Backend: https://nook.runasp.net
 * OpenAPI Spec: https://nook.runasp.net/openapi/v1.json
 */

/**
 * Base URL for the backend API.
 * An empty string '' is used so all API requests are routed through:
 * 1. Angular Dev Server Proxy (proxy.conf.json) in local dev.
 * 2. Vercel Serverless Rewrites (vercel.json) in production.
 * This completely avoids browser CORS preflight issues across all environments.
 */
export const API_BASE_URL = '';


/** API endpoint paths organized by domain */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/Auth/login',
    REGISTER: '/api/Auth/register',
    ME: '/api/Auth/me',
    REFRESH_TOKEN: '/api/Auth/refresh-token',
    REVOKE_TOKEN: '/api/Auth/revoke-token',
    FORGOT_PASSWORD: '/api/Auth/forgot-password',
    RESET_PASSWORD: '/api/Auth/reset-password',
    CHANGE_PASSWORD: '/api/Auth/change-password',
    GOOGLE: '/api/Auth/google',
  },

  ACCOUNTS: {
    LIST: '/api/Accounts',
    BY_ID: (id: string) => `/api/Accounts/${id}`,
    TOGGLE_ACTIVE: (id: string) => `/api/Accounts/${id}/toggle-active`,
    PROFILE: (id: string) => `/api/Accounts/${id}/profile`,
    LINK_STAFF: (id: string) => `/api/Accounts/${id}/profiles/staff`,
    LINK_STUDENT: (id: string) => `/api/Accounts/${id}/profiles/student`,
    LINK_INSTRUCTOR: (id: string) => `/api/Accounts/${id}/profiles/instructor`,
    LINK_PARENT: (id: string) => `/api/Accounts/${id}/profiles/parent`,
    UNLINK_ROLE: (id: string, role: string | number) => `/api/Accounts/${id}/profiles/${role}`,
    UNLINKED_STUDENTS: '/api/Accounts/unlinked-students',
    UNLINKED_INSTRUCTORS: '/api/Accounts/unlinked-instructors',
  },

  WORKSPACES: {
    LIST: '/api/Workspaces',
    BY_ID: (id: string) => `/api/Workspaces/${id}`,
    CHECKOUT: (id: string) => `/api/Workspaces/${id}/checkout`,
    WALK_IN: '/api/Workspaces/walk-in',
    CATERING: (workspaceId: string) => `/api/workspaces/${workspaceId}/catering`,
    CATERING_ITEM: (workspaceId: string, itemId: string) =>
      `/api/workspaces/${workspaceId}/catering/${itemId}`,
  },

  CLASSROOMS: {
    LIST: '/api/Classrooms',
    BY_ID: (id: string) => `/api/Classrooms/${id}`,
    CHECKOUT: (id: string) => `/api/Classrooms/${id}/checkout`,
    CATERING: (classroomId: string) => `/api/classrooms/${classroomId}/catering`,
    CATERING_ITEM: (classroomId: string, itemId: string) =>
      `/api/classrooms/${classroomId}/catering/${itemId}`,
  },

  BOOKINGS: {
    LIST: '/api/Bookings',
    BY_ID: (id: string) => `/api/Bookings/${id}`,
    STATUS: (id: string) => `/api/Bookings/${id}/status`,
  },

  PACKAGES: {
    LIST: '/api/Packages',
    BY_ID: (id: string) => `/api/Packages/${id}`,
    BY_STUDENT: (studentId: string) => `/api/Packages/student/${studentId}`,
  },

  WORKSPACE_PACKAGES: {
    LIST: '/api/WorkspacePackages',
    BY_ID: (id: string) => `/api/WorkspacePackages/${id}`,
    BY_STUDENT: (studentId: string) => `/api/WorkspacePackages/student/${studentId}`,
  },

  CLASSROOM_PACKAGES: {
    LIST: '/api/ClassroomPackages',
    BY_ID: (id: string) => `/api/ClassroomPackages/${id}`,
    BY_INSTRUCTOR: (instructorId: string) => `/api/ClassroomPackages/instructor/${instructorId}`,
  },

  DISCOUNTS: {
    LIST: '/api/Discounts',
    BY_ID: (id: string) => `/api/Discounts/${id}`,
    ACTIVE: '/api/Discounts/active',
    BY_FACULTY: (facultyId: string) => `/api/Discounts/faculty/${facultyId}`,
  },

  COUPONS: {
    LIST: '/api/Coupons',
    BY_ID: (id: string) => `/api/Coupons/${id}`,
    BY_CODE: (code: string) => `/api/Coupons/code/${code}`,
    REDEMPTIONS: (id: string) => `/api/Coupons/${id}/redemptions`,
    REDEEM: (code: string) => `/api/Coupons/redeem/${code}`,
  },

  FACULTIES: {
    LIST: '/api/Faculties',
    BY_ID: (id: string) => `/api/Faculties/${id}`,
  },

  BLACKLISTS: {
    LIST: '/api/Blacklists',
    BY_ID: (id: string) => `/api/Blacklists/${id}`,
  },

  INSTRUCTORS: {
    LIST: '/api/Instructors',
    BY_ID: (id: string) => `/api/Instructors/${id}`,
  },

  ROOMS: {
    LIST: '/api/Rooms',
    BY_ID: (id: string) => `/api/Rooms/${id}`,
    IMAGE: (id: string) => `/api/Rooms/${id}/image`,
  },

  PRICING_PLANS: {
    LIST: '/api/PricingPlans',
    BY_ID: (id: string) => `/api/PricingPlans/${id}`,
    SUGGESTION: '/api/PricingPlans/suggestion',
  },

  PACKAGE_PRICING_PLANS: {
    LIST: '/api/PackagePricingPlans',
    BY_ID: (id: string) => `/api/PackagePricingPlans/${id}`,
  },

  COURSES: {
    LIST: '/api/Courses',
    BY_ID: (id: string) => `/api/Courses/${id}`,
    ENROLL: (courseId: string) => `/api/Courses/${courseId}/enroll`,
    UNENROLL: (courseId: string, studentId: string) => `/api/Courses/${courseId}/enroll/${studentId}`,
    STUDENTS: (courseId: string) => `/api/Courses/${courseId}/students`,
    SESSIONS: (courseId: string) => `/api/Courses/${courseId}/sessions`,
    ATTENDANCE: (sessionId: string) => `/api/Courses/sessions/${sessionId}/attendance`,
    STUDENT_ATTENDANCE: (courseId: string, studentId: string) => `/api/Courses/${courseId}/students/${studentId}/attendance`,
    FILES: (courseId: string) => `/api/Courses/${courseId}/files`,
    FILE_BY_ID: (fileId: string) => `/api/Courses/files/${fileId}`,
    MATERIALS_SUMMARY: (courseId: string) => `/api/Courses/${courseId}/materials-summary`,
    ANNOUNCEMENTS: (courseId: string) => `/api/Courses/${courseId}/announcements`,
  },

  DASHBOARD: {
    SUMMARY: '/api/Dashboard/summary',
  },

  ANALYSIS: {
    REVENUE: '/api/Analysis/revenue',
    OCCUPANCY: '/api/Analysis/occupancy',
    TOP_STUDENTS: '/api/Analysis/top-students',
    INSTRUCTOR_ACTIVITY: '/api/Analysis/instructor-activity',
  },

  SHIFTS: {
    LIST: '/api/Shifts',
    BY_ID: (id: string) => `/api/Shifts/${id}`,
    OPEN: (userId: string) => `/api/Shifts/open/${userId}`,
    CLOSE: (id: string) => `/api/Shifts/${id}/close`,
    ITEMS: (id: string) => `/api/Shifts/${id}/items`,
    ITEM_BY_ID: (shiftId: string, itemId: string) => `/api/Shifts/${shiftId}/items/${itemId}`,
    VERIFY_PASSWORD: (shiftId?: string) => (shiftId ? `/api/Shifts/${shiftId}/verify-password` : '/api/Shifts/verify-password'),
  },

  STUDENTS: {
    LIST: '/api/Students',
    BY_ID: (id: string) => `/api/Students/${id}`,
    CHECKOUT: (id: string) => `/api/Students/${id}/checkout`,
    SEARCH: (term: string) => `/api/Students?search=${encodeURIComponent(term)}`,
  },

  PRODUCTS: {
    LIST: '/api/Products',
    BY_ID: (id: string) => `/api/Products/${id}`,
    IMAGE: (id: string) => `/api/Products/${id}/image`,
  },

  RESERVATIONS: {
    LIST: '/api/Reservations',
    BY_ID: (id: string) => `/api/Reservations/${id}`,
    BY_INSTRUCTOR: (instructorId: string) => `/api/Reservations/instructor/${instructorId}`,
  },

  WALLET: {
    BALANCE: (studentId: string) => `/api/Wallet/student/${studentId}/balance`,
    TRANSACTIONS: (studentId: string) => `/api/Wallet/student/${studentId}/transactions`,
    TOPUP_DIRECT: '/api/Wallet/topup/direct',
    DEDUCT: '/api/Wallet/deduct',
    TOPUP_REQUEST: '/api/Wallet/topup/request',
    TOPUP_REQUESTS: '/api/Wallet/topup/requests',
    TOPUP_REQUEST_BY_ID: (id: string) => `/api/Wallet/topup/requests/${id}`,
    REVIEW_TOPUP_REQUEST: (id: string) => `/api/Wallet/topup/requests/${id}/review`,
  },

  FLOOR_PLANS: {
    LIST: '/api/FloorPlans',
    BY_ID: (id: string) => `/api/FloorPlans/${id}`,
  },

  SEAT_ELEMENTS: {
    LIST_BY_FLOOR_PLAN: (floorPlanId: string) => `/api/SeatElements/floor-plan/${floorPlanId}`,
    BY_ID: (id: string) => `/api/SeatElements/${id}`,
    CREATE: '/api/SeatElements',
    SYNC: (floorPlanId: string) => `/api/SeatElements/sync/${floorPlanId}`,
  },

  SEAT_ELEMENT_TYPES: {
    LIST: '/api/SeatElementTypes',
    BY_ID: (id: string) => `/api/SeatElementTypes/${id}`,
    IMAGE: (id: string) => `/api/SeatElementTypes/${id}/image`,
  },

  MOBILE_INSTRUCTOR: {
    PROFILE: '/api/mobile/instructor/profile',
    ROOMS: '/api/mobile/instructor/rooms',
    ROOM_AVAILABILITY: (roomId: string) => `/api/mobile/instructor/rooms/${roomId}/availability`,
    CLASSROOMS: '/api/mobile/instructor/classrooms',
    CLASSROOM_BY_ID: (id: string) => `/api/mobile/instructor/classrooms/${id}`,
    RESERVATIONS: '/api/mobile/instructor/reservations',
    RESERVATION_BY_ID: (id: string) => `/api/mobile/instructor/reservations/${id}`,
    PACKAGES: '/api/mobile/instructor/packages',
    PRICING_PLANS: '/api/mobile/instructor/pricing-plans',
    PACKAGE_PRICING_PLANS: '/api/mobile/instructor/package-pricing-plans',
    NOTIFICATIONS: '/api/mobile/instructor/notifications',
    READ_NOTIFICATION: (id: string) => `/api/mobile/instructor/notifications/${id}/read`,
    READ_ALL_NOTIFICATIONS: '/api/mobile/instructor/notifications/read-all',
  },

  MOBILE_STUDENT: {
    PROFILE: '/api/mobile/student/profile',
    ROOMS: '/api/mobile/student/rooms',
    ROOM_FLOOR_PLAN: (roomId: string) => `/api/mobile/student/rooms/${roomId}/floor-plan`,
    BOOKINGS: '/api/mobile/student/bookings',
    BOOKING_BY_ID: (id: string) => `/api/mobile/student/bookings/${id}`,
    CANCEL_BOOKING: (id: string) => `/api/mobile/student/bookings/${id}/cancel`,
    WALLET_BALANCE: '/api/mobile/student/wallet/balance',
    WALLET_TRANSACTIONS: '/api/mobile/student/wallet/transactions',
    WALLET_TOPUP: '/api/mobile/student/wallet/topup',
    WALLET_TOPUP_REQUESTS: '/api/mobile/student/wallet/topup-requests',
    PACKAGES: '/api/mobile/student/packages',
    PRICING_PLANS: '/api/mobile/student/pricing-plans',
    PACKAGE_PRICING_PLANS: '/api/mobile/student/package-pricing-plans',
    NOTIFICATIONS: '/api/mobile/student/notifications',
    READ_NOTIFICATION: (id: string) => `/api/mobile/student/notifications/${id}/read`,
    READ_ALL_NOTIFICATIONS: '/api/mobile/student/notifications/read-all',
  },
} as const;

