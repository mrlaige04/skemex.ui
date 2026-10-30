import type { Routes } from '@angular/router';

/**
 * Jira integration routes.
 * Mounted under `/:projectCode/integrations/jira`.
 */
export const JIRA_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'issues' },
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
];
