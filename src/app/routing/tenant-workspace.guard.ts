import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import type { ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

/**
 * Requires a bearer token and workspace context. URL segment {@code tenantId} must match the
 * tenant in the access token, or be another workspace the user belongs to (then we call
 * {@link AuthService.selectTenant} to sync).
 */
export const tenantWorkspaceGuard: CanActivateFn = async (route) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.accessToken()) {
    return router.createUrlTree(['/auth', 'login']);
  }
  const paramId = route.paramMap.get('tenantId');
  if (!paramId) {
    return router.createUrlTree(['/tenant', 'select']);
  }
  const ctx = auth.workspaceContext();
  if (!ctx) {
    return router.createUrlTree(['/tenant', 'select']);
  }
  const leaf = resolveWorkspaceLeafPath(route);
  if (paramId === ctx.tenantId) {
    return true;
  }
  const inMembership = ctx.tenants.some((t) => t.id === paramId);
  if (!inMembership) {
    return router.createUrlTree(['/tenant', ctx.tenantId, leaf]);
  }
  try {
    await auth.selectTenant(paramId);
    return true;
  } catch {
    return router.createUrlTree(['/tenant', ctx.tenantId, leaf]);
  }
};

/** First concrete child segment (e.g. <code>profile</code>, <code>settings</code>); avoids defaulting to dashboard when the snapshot tree is not fully linked yet. */
function resolveWorkspaceLeafPath(route: ActivatedRouteSnapshot): string {
  let node: ActivatedRouteSnapshot | null = route.firstChild ?? route.children[0] ?? null;
  while (node?.routeConfig?.redirectTo) {
    node = node.firstChild ?? node.children[0] ?? null;
  }
  const path = node?.routeConfig?.path ?? node?.url[0]?.path;
  return path && path.length > 0 ? path : 'dashboard';
}
