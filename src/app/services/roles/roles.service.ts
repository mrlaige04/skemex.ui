import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  CreateTenantRoleRequest,
  PermissionGroupDto,
  RoleDetailDto,
  UpdateTenantRoleRequest,
} from '../../models/roles/roles.models';
import { BaseHttp } from '../http/base-http.service';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly api = inject(BaseHttp);

  list(): Promise<RoleDetailDto[]> {
    return firstValueFrom(this.api.get<RoleDetailDto[]>('api/roles'));
  }

  permissions(): Promise<PermissionGroupDto[]> {
    return firstValueFrom(this.api.get<PermissionGroupDto[]>('api/roles/permissions'));
  }

  create(body: CreateTenantRoleRequest): Promise<RoleDetailDto> {
    return firstValueFrom(this.api.post<CreateTenantRoleRequest, RoleDetailDto>('api/roles', body));
  }

  update(id: string, body: UpdateTenantRoleRequest): Promise<RoleDetailDto> {
    return firstValueFrom(
      this.api.put<UpdateTenantRoleRequest, RoleDetailDto>(`api/roles/${id}`, body),
    );
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.api.delete<void>(`api/roles/${id}`));
  }
}
