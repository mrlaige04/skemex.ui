import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { AuthRefreshService } from '../services/auth/auth-refresh.service';
import { AuthTokenStore } from '../services/auth/auth-token.store';
import { APP_PATHS } from './app-paths';
import { AuthService } from '../services/auth/auth.service';
import { isAccessTokenExpired } from '../utils/jwt.util';

/** Guest-only routes (login, register, forgot password). Authenticated users are sent to the app home. */
export const isNotAuthenticatedGuard: CanActivateFn = async () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const tokens = inject(AuthTokenStore);
  const refresh = inject(AuthRefreshService);
  const auth = inject(AuthService);
  const router = inject(Router);

  await tokens.whenHydrated;

  if (!(await hasActiveSession(tokens, refresh))) {
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

async function hasActiveSession(
  tokens: AuthTokenStore,
  refresh: AuthRefreshService,
): Promise<boolean> {
  let accessToken = tokens.accessToken();
  if (!accessToken) {
    return false;
  }

  if (!isAccessTokenExpired(accessToken)) {
    return true;
  }

  return refresh.tryRefresh();
}
