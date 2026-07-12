import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { APP_PATHS } from './app-paths';
import { isReservedAppSegment } from './reserved-app-segments';
import { ProjectsService } from '../services/projects/projects.service';

/** Ensures `:projectCode` is a real project in the current workspace. */
export const projectWorkspaceGuard: CanActivateFn = async (route) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const router = inject(Router);
  const projects = inject(ProjectsService);
  const rawCode = route.paramMap.get('projectCode')?.trim() ?? '';

  if (!rawCode || isReservedAppSegment(rawCode)) {
    return router.createUrlTree([APP_PATHS.projects]);
  }

  const project = await projects.getByCode(rawCode);
  if (!project) {
    return router.createUrlTree([APP_PATHS.projects]);
  }

  return true;
};
