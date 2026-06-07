import { InjectionToken } from '@angular/core';
import type { SaUserDto } from '../../../models/admin/users.models';

export interface SaUsersTableHost {
  editLink(userId: string): string[];
  deleteUser(user: SaUserDto): void;
  deletingId(): string | null;
  fullName(user: SaUserDto): string;
}

export const SA_USERS_TABLE_HOST = new InjectionToken<SaUsersTableHost>('SA_USERS_TABLE_HOST');
