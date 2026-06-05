import { Routes } from '@angular/router';
import { isNotAuthenticatedGuard } from './routing/is-not-authenticated.guard';
import { tenantWorkspaceGuard } from './routing/tenant-workspace.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./pages/auth/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        canActivate: [isNotAuthenticatedGuard],
        loadComponent: () => import('./pages/auth/login/login-page.component').then((m) => m.LoginPageComponent),
      },
      {
        path: 'register',
        canActivate: [isNotAuthenticatedGuard],
        loadComponent: () =>
          import('./pages/auth/register/register-page.component').then((m) => m.RegisterPageComponent),
      },
      {
        path: 'forgot-password',
        canActivate: [isNotAuthenticatedGuard],
        loadComponent: () =>
          import('./pages/auth/forgot-password/forgot-password-page.component').then(
            (m) => m.ForgotPasswordPageComponent,
          ),
        title: 'Reset password',
      },
    ],
  },
  {
    path: 'invitations',
    loadComponent: () => import('./pages/auth/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      {
        path: 'accept',
        loadComponent: () =>
          import('./pages/invitations/accept-invitation-page.component').then(
            (m) => m.AcceptInvitationPageComponent,
          ),
        title: 'Accept invitation',
      },
    ],
  },
  {
    path: 'tenant',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'select' },
      {
        path: 'select',
        loadComponent: () =>
          import('./pages/auth/select-tenant/select-tenant-page.component').then((m) => m.SelectTenantPageComponent),
      },
      {
        path: ':tenantId',
        canActivate: [tenantWorkspaceGuard],
        loadComponent: () =>
          import('./pages/tenant/tenant-base-layout.component').then((m) => m.TenantBaseLayoutComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./pages/tenant/tenant-section-page.component').then((m) => m.TenantSectionPageComponent),
            data: { breadcrumb: 'Dashboard' },
            title: 'Dashboard',
          },
          {
            path: 'users/new',
            loadComponent: () =>
              import('./pages/tenant/users/create-user-page.component').then((m) => m.CreateUserPageComponent),
            data: { breadcrumb: 'Add user' },
            title: 'Add user',
          },
          {
            path: 'users/:userId/edit',
            loadComponent: () =>
              import('./pages/tenant/users/edit-user-page.component').then((m) => m.EditUserPageComponent),
            data: { breadcrumb: 'Edit user' },
            title: 'Edit user',
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./pages/tenant/users/users-page.component').then((m) => m.UsersPageComponent),
            data: { breadcrumb: 'Users' },
            title: 'Users',
          },
          {
            path: 'projects',
            loadComponent: () =>
              import('./pages/tenant/tenant-section-page.component').then((m) => m.TenantSectionPageComponent),
            data: { breadcrumb: 'Projects' },
            title: 'Projects',
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./pages/tenant/tenant-section-page.component').then((m) => m.TenantSectionPageComponent),
            data: { breadcrumb: 'Settings' },
            title: 'Settings',
          },
          {
            path: 'profile',
            loadComponent: () =>
              import('./pages/tenant/account/account-page.component').then((m) => m.AccountPageComponent),
            data: { breadcrumb: 'Profile' },
            title: 'Profile',
          },
        ],
      },
    ],
  },
  { path: 'home', pathMatch: 'full', redirectTo: 'tenant/select' },
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
];
