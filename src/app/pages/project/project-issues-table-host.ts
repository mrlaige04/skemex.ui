import { InjectionToken } from '@angular/core';

export interface ProjectIssuesTableHost {
  projectCode(): string;
}

export const PROJECT_ISSUES_TABLE_HOST = new InjectionToken<ProjectIssuesTableHost>(
  'PROJECT_ISSUES_TABLE_HOST',
);
