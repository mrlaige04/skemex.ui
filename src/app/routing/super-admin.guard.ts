import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { APP_PATHS } from './app-paths';
import { AuthRefreshService } from '../services/auth/auth-refresh.service';
import { AuthTokenStore } from '../services/auth/auth-token.store';
import { AuthService } from '../services/auth/auth.service';
import { isAccessTokenExpired } from '../utils/jwt.util';

/** Requires a platform super-admin JWT ({@code IsSuperAdmin} claim). */
export const superAdminGuard: CanActivateFn = async () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const auth = inject(AuthService);
  const tokens = inject(AuthTokenStore);
  const refresh = inject(AuthRefreshService);
  const router = inject(Router);

  await tokens.whenHydrated;

  let accessToken = tokens.accessToken();
  if (!accessToken) {
    return router.createUrlTree(['/auth', 'login']);
  }

  if (isAccessTokenExpired(accessToken) && !(await refresh.tryRefresh())) {
    return router.createUrlTree(['/auth', 'login']);
  }

  auth.syncSuperAdminFromToken();

  if (!auth.isSuperAdmin()) {
    if (auth.workspaceContext()?.tenantId) {
      return router.createUrlTree([APP_PATHS.dashboard]);
    }
    return router.createUrlTree([APP_PATHS.select]);
  }

  return true;
};
