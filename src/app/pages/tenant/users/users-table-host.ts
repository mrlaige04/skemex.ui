import { InjectionToken } from '@angular/core';
import type { TenantUserDto } from '../../../models/users/users.models';

export interface UsersTableHost {
  editLink(userId: string): string[];
  deleteUser(user: TenantUserDto): void;
  deletingId(): string | null;
  fullName(user: TenantUserDto): string;
}

export const USERS_TABLE_HOST = new InjectionToken<UsersTableHost>('USERS_TABLE_HOST');
