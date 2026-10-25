import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { APP_PATHS } from './app-paths';

export const hasPermissionGuard: CanActivateFn = async (route) => {
  const permission = route.data['permission'] as string | string[] | undefined;
  if (!permission) {
    return true;
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.accessToken()) {
    await router.navigate([APP_PATHS.noAccess]);
    return false;
  }

  // Always refresh from GET api/auth/session so role permission edits apply without re-login.
  await auth.ensureSessionRbac(true);

  const required = Array.isArray(permission) ? permission : [permission];
  const mode = (route.data['permissionMode'] as 'all' | 'any' | undefined) ?? 'all';
  const allowed =
    mode === 'any'
      ? required.some((p) => auth.hasPermission(p))
      : required.every((p) => auth.hasPermission(p));

  if (!allowed) {
    await router.navigate([APP_PATHS.noAccess]);
    return false;
  }

  return true;
};
