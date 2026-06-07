import { InjectionToken } from '@angular/core';
import type { SaTenantDto } from '../../../models/admin/tenants.models';

export interface TenantsTableHost {
  editLink(tenantId: string): string[];
  deleteTenant(tenant: SaTenantDto): void;
  deletingId(): string | null;
  displayName(tenant: SaTenantDto): string;
}

export const TENANTS_TABLE_HOST = new InjectionToken<TenantsTableHost>('TENANTS_TABLE_HOST');
