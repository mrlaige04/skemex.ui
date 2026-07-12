import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  CreateTenantColumnRequest,
  ReorderTenantColumnsRequest,
  TenantColumnDto,
  UpdateTenantColumnRequest,
} from '../../models/tenant-columns/tenant-columns.models';
import { BaseHttp } from '../http/base-http.service';

@Injectable({ providedIn: 'root' })
export class TenantColumnsService {
  private readonly api = inject(BaseHttp);

  list(): Promise<TenantColumnDto[]> {
    return firstValueFrom(this.api.get<TenantColumnDto[]>('api/tenant-columns'));
  }

  get(id: string): Promise<TenantColumnDto> {
    return firstValueFrom(this.api.get<TenantColumnDto>(`api/tenant-columns/${id}`));
  }

  create(body: CreateTenantColumnRequest): Promise<TenantColumnDto> {
    return firstValueFrom(
      this.api.post<CreateTenantColumnRequest, TenantColumnDto>('api/tenant-columns', body),
    );
  }

  update(id: string, body: UpdateTenantColumnRequest): Promise<TenantColumnDto> {
    return firstValueFrom(
      this.api.patch<UpdateTenantColumnRequest, TenantColumnDto>(`api/tenant-columns/${id}`, body),
    );
  }

  reorder(body: ReorderTenantColumnsRequest): Promise<TenantColumnDto[]> {
    return firstValueFrom(
      this.api.put<ReorderTenantColumnsRequest, TenantColumnDto[]>('api/tenant-columns/reorder', body),
    );
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.api.delete<void>(`api/tenant-columns/${id}`));
  }
}
