import { Routes } from '@angular/router';
import { isNotAuthenticatedGuard } from './routing/is-not-authenticated.guard';
import { superAdminGuard } from './routing/super-admin.guard';
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
    path: 'tenant-select',
    loadComponent: () =>
      import('./pages/auth/select-tenant/select-tenant-page.component').then((m) => m.SelectTenantPageComponent),
  },
  {
    path: 'admin',
    canActivate: [superAdminGuard],
    loadComponent: () =>
      import('./pages/tenant/tenant-base-layout.component').then((m) => m.TenantBaseLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/tenant/tenant-section-page.component').then((m) => m.TenantSectionPageComponent),
        data: { breadcrumb: 'Overview' },
        title: 'Platform overview',
      },
      {
        path: 'tenants/new',
        loadComponent: () =>
          import('./pages/admin/tenants/create-tenant-page.component').then((m) => m.CreateTenantPageComponent),
        data: { breadcrumb: 'Add tenant' },
        title: 'Add tenant',
      },
      {
        path: 'tenants/:tenantId/edit',
        loadComponent: () =>
          import('./pages/admin/tenants/edit-tenant-page.component').then((m) => m.EditTenantPageComponent),
        data: { breadcrumb: 'Edit tenant' },
        title: 'Edit tenant',
      },
      {
        path: 'tenants',
        loadComponent: () =>
          import('./pages/admin/tenants/tenants-page.component').then((m) => m.TenantsPageComponent),
        data: { breadcrumb: 'Tenants' },
        title: 'Tenants',
      },
      {
        path: 'users/new',
        loadComponent: () =>
          import('./pages/admin/users/create-sa-user-page.component').then((m) => m.CreateSaUserPageComponent),
        data: { breadcrumb: 'Add user' },
        title: 'Add user',
      },
      {
        path: 'users/:userId/edit',
        loadComponent: () =>
          import('./pages/admin/users/edit-sa-user-page.component').then((m) => m.EditSaUserPageComponent),
        data: { breadcrumb: 'Edit user' },
        title: 'Edit user',
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/admin/users/sa-users-page.component').then((m) => m.SaUsersPageComponent),
        data: { breadcrumb: 'Users' },
        title: 'Platform users',
      },
      {
        path: 'email-templates/:templateId/edit',
        loadComponent: () =>
          import('./pages/admin/email-templates/edit-email-template-page.component').then(
            (m) => m.EditEmailTemplatePageComponent,
          ),
        data: { breadcrumb: 'Edit email template' },
        title: 'Edit email template',
      },
      {
        path: 'email-templates',
        loadComponent: () =>
          import('./pages/admin/email-templates/email-templates-page.component').then(
            (m) => m.EmailTemplatesPageComponent,
          ),
        data: { breadcrumb: 'Email templates' },
        title: 'Email templates',
      },
    ],
  },
  {
    path: '',
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
  { path: 'home', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
