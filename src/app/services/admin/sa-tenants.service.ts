import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  CreateSaTenantRequest,
  SaTenantDto,
  UpdateSaTenantRequest,
} from '../../models/admin/tenants.models';
import type { PaginatedList } from '../../models/paginated-list';
import { BaseHttp } from '../http/base-http.service';

@Injectable({ providedIn: 'root' })
export class SaTenantsService {
  private readonly api = inject(BaseHttp);

  list(search?: string, page = 1, pageSize = 10): Promise<PaginatedList<SaTenantDto>> {
    const params: Record<string, string | number> = { page, pageSize };
    const term = search?.trim();
    if (term) {
      params['search'] = term;
    }
    return firstValueFrom(this.api.get<PaginatedList<SaTenantDto>>('api/sa/tenants', params));
  }

  get(id: string): Promise<SaTenantDto> {
    return firstValueFrom(this.api.get<SaTenantDto>(`api/sa/tenants/${id}`));
  }

  create(body: CreateSaTenantRequest): Promise<SaTenantDto> {
    return firstValueFrom(this.api.post<CreateSaTenantRequest, SaTenantDto>('api/sa/tenants', body));
  }

  update(id: string, body: UpdateSaTenantRequest): Promise<SaTenantDto> {
    return firstValueFrom(this.api.patch<UpdateSaTenantRequest, SaTenantDto>(`api/sa/tenants/${id}`, body));
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.api.delete<void>(`api/sa/tenants/${id}`));
  }
}
