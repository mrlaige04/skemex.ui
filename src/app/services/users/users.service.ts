import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { PaginatedList } from '../../models/paginated-list';
import type {
  CreateTenantUserRequest,
  LookupUserByEmailResponse,
  TenantRoleDto,
  TenantUserDto,
  UpdateTenantUserRequest,
} from '../../models/users/users.models';
import { BaseHttp } from '../http/base-http.service';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(BaseHttp);

  list(search?: string, page = 1, pageSize = 10): Promise<PaginatedList<TenantUserDto>> {
    const params: Record<string, string | number> = { page, pageSize };
    const term = search?.trim();
    if (term) {
      params['search'] = term;
    }
    return firstValueFrom(this.api.get<PaginatedList<TenantUserDto>>('api/users', params));
  }

  get(id: string): Promise<TenantUserDto> {
    return firstValueFrom(this.api.get<TenantUserDto>(`api/users/${id}`));
  }

  roles(): Promise<TenantRoleDto[]> {
    return firstValueFrom(this.api.get<TenantRoleDto[]>('api/users/roles'));
  }

  lookupByEmail(email: string): Promise<LookupUserByEmailResponse> {
    return firstValueFrom(
      this.api.get<LookupUserByEmailResponse>('api/users/lookup', { email: email.trim() }),
    );
  }

  create(body: CreateTenantUserRequest): Promise<TenantUserDto> {
    return firstValueFrom(this.api.post<CreateTenantUserRequest, TenantUserDto>('api/users', body));
  }

  update(id: string, body: UpdateTenantUserRequest): Promise<TenantUserDto> {
    return firstValueFrom(this.api.patch<UpdateTenantUserRequest, TenantUserDto>(`api/users/${id}`, body));
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.api.delete<void>(`api/users/${id}`));
  }
}
