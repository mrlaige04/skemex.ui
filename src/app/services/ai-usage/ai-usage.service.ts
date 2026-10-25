import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { PaginatedList } from '../../models/paginated-list';
import type {
  AiUsageActivityDto,
  AiUsageGroupDto,
  ListAiUsageParams,
  ProjectAiUsageSummaryDto,
} from '../../models/ai-usage/ai-usage.models';
import { BaseHttp } from '../http/base-http.service';

@Injectable({ providedIn: 'root' })
export class AiUsageService {
  private readonly api = inject(BaseHttp);

  getSummary(projectId: string, from?: string, to?: string): Promise<ProjectAiUsageSummaryDto> {
    const params: Record<string, string> = {};
    if (from) {
      params['from'] = from;
    }
    if (to) {
      params['to'] = to;
    }
    return firstValueFrom(
      this.api.get<ProjectAiUsageSummaryDto>(`api/projects/${projectId}/ai/usage/summary`, params),
    );
  }

  list(projectId: string, options: ListAiUsageParams = {}): Promise<PaginatedList<AiUsageActivityDto>> {
    return firstValueFrom(
      this.api.get<PaginatedList<AiUsageActivityDto>>(
        `api/projects/${projectId}/ai/usage`,
        this.toParams(options),
      ),
    );
  }

  listGroups(projectId: string, options: ListAiUsageParams = {}): Promise<PaginatedList<AiUsageGroupDto>> {
    return firstValueFrom(
      this.api.get<PaginatedList<AiUsageGroupDto>>(
        `api/projects/${projectId}/ai/usage/groups`,
        this.toParams(options),
      ),
    );
  }

  private toParams(options: ListAiUsageParams): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {
      page: options.page ?? 1,
      pageSize: options.pageSize ?? 20,
      sort: options.sort ?? 'createdAtDesc',
    };

    const search = options.search?.trim();
    if (search) {
      params['search'] = search;
    }
    if (options.operationType) {
      params['operationType'] = options.operationType;
    }
    if (options.operationName) {
      params['operationName'] = options.operationName;
    }
    if (options.success !== undefined) {
      params['success'] = options.success;
    }
    if (options.userId) {
      params['userId'] = options.userId;
    }
    if (options.from) {
      params['from'] = options.from;
    }
    if (options.to) {
      params['to'] = options.to;
    }

    return params;
  }
}
