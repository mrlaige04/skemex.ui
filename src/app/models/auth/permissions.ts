/** Mirrors backend `PermissionNames` (`resource:action`). */
export const PERMISSIONS = {
  aiChat: 'ai:chat',
  aiExecute: 'ai:execute',
  aiViewUsage: 'ai:view_usage',

  documentsUpload: 'documents:upload',
  documentsView: 'documents:view',
  documentsEdit: 'documents:edit',
  documentsDelete: 'documents:delete',

  projectsCreate: 'projects:create',
  projectsEdit: 'projects:edit',
  projectsView: 'projects:view',
  projectsDelete: 'projects:delete',
  projectsViewAll: 'projects:view_all',

  settingsColumnsView: 'settings:columns_view',
  settingsColumnsCreate: 'settings:columns_create',
  settingsColumnsEdit: 'settings:columns_edit',
  settingsColumnsDelete: 'settings:columns_delete',

  settingsSpecializationsView: 'settings:specializations_view',
  settingsSpecializationsCreate: 'settings:specializations_create',
  settingsSpecializationsEdit: 'settings:specializations_edit',
  settingsSpecializationsDelete: 'settings:specializations_delete',

  settingsRolesView: 'settings:roles_view',
  settingsRolesCreate: 'settings:roles_create',
  settingsRolesEdit: 'settings:roles_edit',
  settingsRolesDelete: 'settings:roles_delete',

  tasksCreate: 'tasks:create',
  tasksView: 'tasks:view',
  tasksEdit: 'tasks:edit',
  tasksDelete: 'tasks:delete',

  usersCreate: 'users:create',
  usersEdit: 'users:edit',
  usersView: 'users:view',
  usersDelete: 'users:delete',
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_NAMES = {
  admin: 'Admin',
  manager: 'Manager',
  developer: 'Developer',
  qa: 'QA',
} as const;
