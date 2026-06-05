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
} as const;

export function workspaceSectionPath(segment: string): string[] {
  return [segment.startsWith('/') ? segment.slice(1) : segment];
}
