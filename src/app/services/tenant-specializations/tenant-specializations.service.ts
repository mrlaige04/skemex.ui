import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  CreateTenantSpecializationRequest,
  TenantSpecializationDto,
  UpdateTenantSpecializationRequest,
} from '../../models/tenant-specializations/tenant-specializations.models';
import type { TenantUserDto } from '../../models/users/users.models';
import { BaseHttp } from '../http/base-http.service';

@Injectable({ providedIn: 'root' })
export class TenantSpecializationsService {
  private readonly api = inject(BaseHttp);

  list(): Promise<TenantSpecializationDto[]> {
    return firstValueFrom(this.api.get<TenantSpecializationDto[]>('api/tenant-specializations'));
  }

  get(id: string): Promise<TenantSpecializationDto> {
    return firstValueFrom(this.api.get<TenantSpecializationDto>(`api/tenant-specializations/${id}`));
  }

  create(body: CreateTenantSpecializationRequest): Promise<TenantSpecializationDto> {
    return firstValueFrom(
      this.api.post<CreateTenantSpecializationRequest, TenantSpecializationDto>(
        'api/tenant-specializations',
        body,
      ),
    );
  }

  update(id: string, body: UpdateTenantSpecializationRequest): Promise<TenantSpecializationDto> {
    return firstValueFrom(
      this.api.patch<UpdateTenantSpecializationRequest, TenantSpecializationDto>(
        `api/tenant-specializations/${id}`,
        body,
      ),
    );
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.api.delete<void>(`api/tenant-specializations/${id}`));
  }

  assign(specializationId: string, userId: string): Promise<TenantUserDto> {
    return firstValueFrom(
      this.api.post<Record<string, never>, TenantUserDto>(
        `api/tenant-specializations/${specializationId}/users/${userId}`,
        {},
      ),
    );
  }

  unassign(specializationId: string, userId: string): Promise<TenantUserDto> {
    return firstValueFrom(
      this.api.delete<TenantUserDto>(
        `api/tenant-specializations/${specializationId}/users/${userId}`,
      ),
    );
  }
}
