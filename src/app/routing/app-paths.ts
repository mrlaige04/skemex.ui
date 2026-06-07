/** Workspace-scoped routes (tenant id is stored, not in the URL). */
export const APP_PATHS = {
  select: '/tenant-select',
  dashboard: '/dashboard',
  users: '/users',
  usersNew: '/users/new',
  userEdit: (userId: string) => `/users/${userId}/edit`,
  projects: '/projects',
  settings: '/settings',
  profile: '/profile',
  adminDashboard: '/admin/dashboard',
  adminTenants: '/admin/tenants',
  adminTenantsNew: '/admin/tenants/new',
  adminTenantEdit: (tenantId: string) => `/admin/tenants/${tenantId}/edit`,
  adminUsers: '/admin/users',
  adminEmailTemplates: '/admin/email-templates',
  adminEmailTemplateEdit: (templateId: string) => `/admin/email-templates/${templateId}/edit`,
} as const;

export function workspaceSectionPath(segment: string): string[] {
  return [segment.startsWith('/') ? segment.slice(1) : segment];
}

/** Absolute router link array under `/admin/...` (use from anywhere, including the admin layout). */
export function adminSectionPath(segment: string): string[] {
  const normalized = segment.startsWith('/') ? segment.slice(1) : segment;
  return ['/admin', normalized];
}

/** Absolute router link array for nested admin routes, e.g. `/admin/tenants/new`. */
export function adminAbsolutePath(...segments: string[]): string[] {
  return [
    '/admin',
    ...segments.map((segment) => (segment.startsWith('/') ? segment.slice(1) : segment)),
  ];
}
