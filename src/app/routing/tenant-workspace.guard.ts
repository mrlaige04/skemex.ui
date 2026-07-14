import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { APP_PATHS } from './app-paths';
import { AuthRefreshService } from '../services/auth/auth-refresh.service';
import { AuthService } from '../services/auth/auth.service';

/** Requires a bearer token and a selected workspace (stored in localStorage). */
export const tenantWorkspaceGuard: CanActivateFn = async () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const auth = inject(AuthService);
  const refresh = inject(AuthRefreshService);
  const router = inject(Router);

  if (!(await refresh.ensureValidAccessToken())) {
    return router.createUrlTree(['/auth', 'login']);
  }

  auth.syncSuperAdminFromToken();

  if (auth.isSuperAdmin()) {
    return router.createUrlTree([APP_PATHS.adminDashboard]);
  }

  if (!auth.workspaceContext()?.tenantId) {
    return router.createUrlTree([APP_PATHS.select]);
  }

  return true;
};
