import type { Routes } from '@angular/router';

/**
 * Project integrations feature routes.
 * Mounted under `/:projectCode/integrations`.
 * Add a sibling provider folder + loadChildren entry for each new integration.
 */
export const INTEGRATIONS_ROUTES: Routes = [
  {
    path: 'jira',
    loadChildren: () => import('./jira/jira.routes').then((m) => m.JIRA_ROUTES),
  },
];
