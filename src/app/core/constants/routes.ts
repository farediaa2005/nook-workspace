/**
 * Centralized route path constants.
 * Use these instead of hardcoding route strings in templates or navigation calls.
 */
export const ROUTES = {
  AUTH: {
    ROOT: 'auth',
    LOGIN: 'auth/login',
  },

  DASHBOARD: 'dashboard',

  WORKSPACE: {
    ROOT: 'workspace',
    ADD_STUDENT: 'workspace/add-student',
    SHOW_STUDENT: 'workspace/show-student',
    CHECKOUT: 'workspace/checkout',
  },

  CLASSROOM: {
    ROOT: 'classroom',
    ADD_CLASSROOM: 'classroom/add-classroom',
    SHOW_CLASSROOM: 'classroom/show-classroom',
    CHECKOUT: 'classroom/checkout',
    ADD_RESERVATION: 'classroom/add-reservation',
    SHOW_RESERVATION: 'classroom/show-reservation',
    RESERVATION: 'classroom/reservation',
    ADMIN_CONSOLE: 'classroom/admin-console',
  },

  PACKAGE: {
    ROOT: 'package',
    ADD_STUDENT_PACKAGE: 'package/add-student-package',
    SHOW_STUDENT_PACKAGE: 'package/show-student-package',
    ADD_INSTRUCTOR_PACKAGE: 'package/add-instructor-package',
    SHOW_INSTRUCTOR_PACKAGE: 'package/show-instructor-package',
  },

  SHIFT: {
    ROOT: 'shift',
    ADD_SHIFT: 'shift/add-shift',
    SHOW_SHIFT: 'shift/show-shift',
    SEARCH_SHIFT: 'shift/search-shift',
  },

  DETAILS: {
    ROOT: 'details',
    ADD_DISCOUNT: 'settings/discounts',
    SHOW_COLLEGES: 'details/show-colleges',
    SHOW_BLACKLIST: 'details/show-blacklist',
    SHOW_INSTRUCTORS: 'details/show-instructors',
  },

  CATERING: {
    ROOT: 'catering',
    ADD_PRODUCTS: 'catering/add-products',
    SHOW_PRODUCTS: 'catering/show-products',
    PRODUCT_GRAPH: 'catering/product-graph',
  },

  SETTINGS: {
    ROOT: 'settings',
    GENERAL: 'settings/general',
    DISCOUNTS: 'settings/discounts',
    ADD_DISCOUNT: 'settings/discounts',
    ADD_USER: 'settings/add-user',
    SHOW_USER: 'settings/show-user',
    PROFILE: 'settings/profile',
  },
} as const;