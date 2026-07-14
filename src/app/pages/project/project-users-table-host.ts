import { InjectionToken } from '@angular/core';
import type { ProjectUserDto } from '../../models/projects/projects.models';

export interface ProjectUsersTableHost {
  deletingId(): string | null;
  fullName(user: ProjectUserDto): string;
  removeUser(user: ProjectUserDto): void;
}

export const PROJECT_USERS_TABLE_HOST = new InjectionToken<ProjectUsersTableHost>(
  'PROJECT_USERS_TABLE_HOST',
);
