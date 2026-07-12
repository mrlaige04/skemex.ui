/** Workspace-scoped routes (tenant id is stored, not in the URL). */
export const APP_PATHS = {
  select: '/tenant-select',
  dashboard: '/dashboard',
  users: '/users',
  usersNew: '/users/new',
  userEdit: (userId: string) => `/users/${userId}/edit`,
  projects: '/projects',
  projectsNew: '/projects/new',
  project: (projectCode: string) => `/${projectCode}`,
  projectBoard: (projectCode: string) => `/${projectCode}/board`,
  projectTaskNew: (projectCode: string) => `/${projectCode}/tasks/new`,
  projectBacklog: (projectCode: string) => `/${projectCode}/backlog`,
  projectIssues: (projectCode: string) => `/${projectCode}/issues`,
  projectUsers: (projectCode: string) => `/${projectCode}/users`,
  projectSettings: (projectCode: string) => `/${projectCode}/settings`,
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

/** Absolute router link array under `/{projectCode}/...`. */
export function projectSectionPath(projectCode: string, segment: string): string[] {
  const normalized = segment.startsWith('/') ? segment.slice(1) : segment;
  const segments = normalized.split('/').filter((part) => part.length > 0);
  return ['/', projectCode, ...segments];
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
