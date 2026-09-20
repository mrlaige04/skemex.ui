import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  SaAgentToolDto,
  SaAgentToolSummaryDto,
  UpdateSaAgentToolRequest,
} from '../../models/admin/agent-tools.models';
import { BaseHttp } from '../http/base-http.service';

@Injectable({ providedIn: 'root' })
export class SaAgentToolsService {
  private readonly api = inject(BaseHttp);

  list(search?: string): Promise<SaAgentToolSummaryDto[]> {
    const params: Record<string, string> = {};
    const term = search?.trim();
    if (term) {
      params['search'] = term;
    }
    return firstValueFrom(this.api.get<SaAgentToolSummaryDto[]>('api/sa/agent-tools', params));
  }

  get(id: string): Promise<SaAgentToolDto> {
    return firstValueFrom(this.api.get<SaAgentToolDto>(`api/sa/agent-tools/${id}`));
  }

  update(id: string, body: UpdateSaAgentToolRequest): Promise<SaAgentToolDto> {
    return firstValueFrom(
      this.api.patch<UpdateSaAgentToolRequest, SaAgentToolDto>(`api/sa/agent-tools/${id}`, body),
    );
  }
}
