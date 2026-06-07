import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  CreateSaUserRequest,
  SaUserDto,
  UpdateSaUserRequest,
} from '../../models/admin/users.models';
import type { PaginatedList } from '../../models/paginated-list';
import { BaseHttp } from '../http/base-http.service';

@Injectable({ providedIn: 'root' })
export class SaUsersService {
  private readonly api = inject(BaseHttp);

  list(search?: string, page = 1, pageSize = 10): Promise<PaginatedList<SaUserDto>> {
    const params: Record<string, string | number> = { page, pageSize };
    const term = search?.trim();
    if (term) {
      params['search'] = term;
    }
    return firstValueFrom(this.api.get<PaginatedList<SaUserDto>>('api/sa/users', params));
  }

  get(id: string): Promise<SaUserDto> {
    return firstValueFrom(this.api.get<SaUserDto>(`api/sa/users/${id}`));
  }

  create(body: CreateSaUserRequest): Promise<SaUserDto> {
    return firstValueFrom(this.api.post<CreateSaUserRequest, SaUserDto>('api/sa/users', body));
  }

  update(id: string, body: UpdateSaUserRequest): Promise<SaUserDto> {
    return firstValueFrom(this.api.patch<UpdateSaUserRequest, SaUserDto>(`api/sa/users/${id}`, body));
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.api.delete<void>(`api/sa/users/${id}`));
  }
}
