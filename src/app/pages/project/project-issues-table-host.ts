import { InjectionToken } from '@angular/core';
import type { ProjectTaskDto } from '../../models/projects/projects.models';

export interface ProjectIssuesTableHost {
  projectCode(): string;
  deletingId(): string | null;
  deleteIssue(issue: ProjectTaskDto): void;
}

export const PROJECT_ISSUES_TABLE_HOST = new InjectionToken<ProjectIssuesTableHost>(
  'PROJECT_ISSUES_TABLE_HOST',
);
