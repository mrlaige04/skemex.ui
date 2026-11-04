import type { Routes } from '@angular/router';

/**
 * Jira integration routes.
 * Mounted under `/:projectCode/integrations/jira`.
 */
export const JIRA_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'settings' },
  {
    path: 'settings',
    loadComponent: () =>
      import('./jira-settings-page.component').then((m) => m.JiraSettingsPageComponent),
    data: { breadcrumb: 'Jira settings' },
    title: 'Jira settings',
  },
  {
    path: 'issues',
    loadComponent: () =>
      import('./jira-issues-page.component').then((m) => m.JiraIssuesPageComponent),
    data: { breadcrumb: 'Jira issues' },
    title: 'Jira issues',
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./jira-users-page.component').then((m) => m.JiraUsersPageComponent),
    data: { breadcrumb: 'Jira users' },
    title: 'Jira users',
  },
  {
    path: 'mappings',
    loadComponent: () =>
      import('./jira-mappings-page.component').then((m) => m.JiraMappingsPageComponent),
    data: { breadcrumb: 'Jira mappings' },
    title: 'Jira mappings',
  },
];
