import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { APP_PATHS } from './app-paths';

export const hasRoleGuard: CanActivateFn = async (route) => {
  const role = route.data['role'] as string | string[] | undefined;
  if (!role) {
    return true;
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.accessToken()) {
    await router.navigate([APP_PATHS.noAccess]);
    return false;
  }

  const required = Array.isArray(role) ? role : [role];
  const allowed = required.some((r) => auth.hasRole(r));
  if (!allowed) {
    await router.navigate([APP_PATHS.noAccess]);
    return false;
  }

  return true;
};
