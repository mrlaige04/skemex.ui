import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { AuthRefreshService } from '../services/auth/auth-refresh.service';
import { APP_PATHS } from './app-paths';
import { AuthService } from '../services/auth/auth.service';

/** Guest-only routes (login, register, forgot password). Authenticated users are sent to the app home. */
export const isNotAuthenticatedGuard: CanActivateFn = async () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const refresh = inject(AuthRefreshService);
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!(await refresh.ensureValidAccessToken())) {
    return true;
  }

  auth.syncSuperAdminFromToken();

  if (auth.isSuperAdmin()) {
    return router.createUrlTree([APP_PATHS.adminDashboard]);
  }

  if (auth.workspaceContext()?.tenantId) {
    return router.createUrlTree([APP_PATHS.dashboard]);
  }

  return router.createUrlTree([APP_PATHS.select]);
};
