import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // Auth Layout
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./auth/login/login.component').then((m) => m.LoginComponent),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // Main Dashboard Layout (Protected)
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },

      // Packages Direct Route
      {
        path: 'packages',
        redirectTo: 'package/student',
        pathMatch: 'full',
      },

      // Package Group Routes (Instructor & Student)
      {
        path: 'package',
        children: [
          { path: '', redirectTo: 'student', pathMatch: 'full' },
          {
            path: 'student',
            loadComponent: () =>
              import(
                './features/package/show-student-package/show-student-package.component'
              ).then((m) => m.ShowStudentPackageComponent),
          },
          {
            path: 'instructor',
            loadComponent: () =>
              import(
                './features/package/show-instructor-package/show-instructor-package.component'
              ).then((m) => m.ShowInstructorPackageComponent),
          },
          {
            path: 'show-student-package',
            redirectTo: 'student',
            pathMatch: 'full',
          },
          {
            path: 'show-instructor-package',
            redirectTo: 'instructor',
            pathMatch: 'full',
          },
          {
            path: 'show-student-packages',
            redirectTo: 'student',
            pathMatch: 'full',
          },
          {
            path: 'show-instructor-packages',
            redirectTo: 'instructor',
            pathMatch: 'full',
          },
          {
            path: 'add-student-package',
            loadComponent: () =>
              import(
                './features/package/add-student-package/add-student-package.component'
              ).then((m) => m.AddStudentPackageComponent),
          },
          {
            path: 'add-instructor-package',
            loadComponent: () =>
              import(
                './features/package/add-instructor-package/add-instructor-package.component'
              ).then((m) => m.AddInstructorPackageComponent),
          },
        ],
      },

      // Workspace
      {
        path: 'workspace',
        children: [
          {
            path: 'add-student',
            loadComponent: () =>
              import('./features/workspace/add-student/add-student.component').then(
                (m) => m.AddStudentComponent
              ),
          },
          {
            path: 'show-student',
            loadComponent: () =>
              import('./features/workspace/show-student/show-student.component').then(
                (m) => m.ShowStudentComponent
              ),
          },
          {
            path: 'checkout',
            loadComponent: () =>
              import('./features/workspace/checkout/checkout.component').then(
                (m) => m.WorkspaceCheckoutComponent
              ),
          },
        ],
      },

      // Classroom & Reservations
      {
        path: 'classroom',
        children: [
          {
            path: 'add-classroom',
            loadComponent: () =>
              import('./features/classroom/add-classroom/add-classroom.component').then(
                (m) => m.AddClassroomComponent
              ),
          },
          {
            path: 'show-classroom',
            loadComponent: () =>
              import('./features/classroom/show-classroom/show-classroom.component').then(
                (m) => m.ShowClassroomComponent
              ),
          },
          {
            path: 'checkout',
            loadComponent: () =>
              import('./features/classroom/checkout/checkout.component').then(
                (m) => m.ClassroomCheckoutComponent
              ),
          },
          {
            path: 'add-reservation',
            redirectTo: 'add-classroom',
            pathMatch: 'full',
          },
          {
            path: 'show-reservation/:id',
            loadComponent: () =>
              import('./features/classroom/show-reservation/show-reservation.component').then(
                (m) => m.ShowReservationComponent
              ),
          },
          {
            path: 'show-reservation',
            loadComponent: () =>
              import('./features/classroom/show-reservation/show-reservation.component').then(
                (m) => m.ShowReservationComponent
              ),
          },
          {
            path: 'reservation',
            loadComponent: () =>
              import('./features/classroom/classroom-reservations/classroom-reservations.component').then(
                (m) => m.ClassroomReservationsComponent
              ),
          },
          {
            path: 'admin-console',
            redirectTo: 'reservation',
            pathMatch: 'full',
          },
        ],
      },

      // Shift
      {
        path: 'shift',
        children: [
          {
            path: '',
            redirectTo: 'active',
            pathMatch: 'full',
          },
          {
            path: 'active',
            loadComponent: () =>
              import('./features/shift/active-shift/active-shift.component').then(
                (m) => m.ActiveShiftComponent
              ),
          },
          {
            path: 'history',
            loadComponent: () =>
              import('./features/shift/shift-history/shift-history.component').then(
                (m) => m.ShiftHistoryComponent
              ),
          },
          {
            path: 'end-of-shift-balance',
            loadComponent: () =>
              import('./features/shift/end-of-shift-balance/end-of-shift-balance.component').then(
                (m) => m.EndOfShiftBalanceComponent
              ),
          },
          {
            path: 'add-shift',
            loadComponent: () =>
              import('./features/shift/add-shift/add-shift.component').then(
                (m) => m.AddShiftComponent
              ),
          },
          {
            path: 'show-shift',
            loadComponent: () =>
              import('./features/shift/show-shift/show-shift.component').then(
                (m) => m.ShowShiftComponent
              ),
          },
          {
            path: 'show-shift/:id',
            loadComponent: () =>
              import('./features/shift/show-shift/show-shift.component').then(
                (m) => m.ShowShiftComponent
              ),
          },
          {
            path: 'search-shift',
            loadComponent: () =>
              import('./features/shift/search-shift/search-shift.component').then(
                (m) => m.SearchShiftComponent
              ),
          },
        ],
      },

      // Details
      {
        path: 'details',
        children: [
          {
            path: 'show-students',
            loadComponent: () =>
              import('./features/details/show-students/show-students.component').then(
                (m) => m.ShowStudentsComponent
              ),
          },
          {
            path: 'students',
            redirectTo: 'show-students',
            pathMatch: 'full',
          },
          {
            path: 'show-student',
            redirectTo: 'show-students',
            pathMatch: 'full',
          },
          {
            path: 'add-discount',
            redirectTo: '/settings/discounts',
            pathMatch: 'full',
          },
          {
            path: 'show-discount',
            redirectTo: '/settings/discounts',
            pathMatch: 'full',
          },
          {
            path: 'show-discounts',
            redirectTo: '/settings/discounts',
            pathMatch: 'full',
          },
          {
            path: 'discounts',
            redirectTo: '/settings/discounts',
            pathMatch: 'full',
          },
          {
            path: 'show-colleges',
            loadComponent: () =>
              import('./features/details/show-colleges/show-colleges.component').then(
                (m) => m.ShowCollegesComponent
              ),
          },
          {
            path: 'show-blacklist',
            loadComponent: () =>
              import('./features/details/show-blacklist/show-blacklist.component').then(
                (m) => m.ShowBlacklistComponent
              ),
          },
          {
            path: 'show-instructors',
            loadComponent: () =>
              import('./features/details/show-instructors/show-instructors.component').then(
                (m) => m.ShowInstructorsComponent
              ),
          },
        ],
      },

      // Catering
      {
        path: 'catering',
        children: [
          {
            path: 'add-products',
            loadComponent: () =>
              import('./features/catering/add-products/add-products.component').then(
                (m) => m.AddProductsComponent
              ),
          },
          {
            path: 'show-products',
            loadComponent: () =>
              import('./features/catering/show-products/show-products.component').then(
                (m) => m.ShowProductsComponent
              ),
          },
          {
            path: 'product-graph',
            loadComponent: () =>
              import('./features/catering/product-graph/product-graph.component').then(
                (m) => m.ProductGraphComponent
              ),
          },
        ],
      },

      // Settings
      {
        path: 'settings',
        children: [
          { path: '', redirectTo: 'general', pathMatch: 'full' },
          {
            path: 'general',
            canActivate: [adminGuard],
            loadComponent: () =>
              import('./features/settings/settings.component').then(
                (m) => m.SettingsComponent
              ),
          },
          {
            path: 'discounts',
            loadComponent: () =>
              import('./features/details/add-discount/add-discount.component').then(
                (m) => m.AddDiscountComponent
              ),
          },
          {
            path: 'add-discount',
            redirectTo: 'discounts',
            pathMatch: 'full',
          },
          {
            path: 'add-user',
            redirectTo: 'show-user',
            pathMatch: 'full',
          },
          {
            path: 'show-user',
            canActivate: [adminGuard],
            loadComponent: () =>
              import('./features/settings/show-user/show-user.component').then(
                (m) => m.ShowUserComponent
              ),
          },
          {
            path: 'profile',
            loadComponent: () =>
              import('./features/settings/profile/profile.component').then(
                (m) => m.ProfileComponent
              ),
          },
        ],
      },
      {
        path: 'users',
        redirectTo: 'settings/show-user',
        pathMatch: 'full',
      },
      {
        path: 'show-users',
        redirectTo: 'settings/show-user',
        pathMatch: 'full',
      },
      {
        path: 'profile',
        redirectTo: 'settings/profile',
        pathMatch: 'full',
      },
      {
        path: 'discounts',
        redirectTo: 'settings/discounts',
        pathMatch: 'full',
      },
    ],
  },

  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent
      ),
  },
];