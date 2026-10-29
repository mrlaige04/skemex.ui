import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  JiraAccessibleResourceDto,
  JiraAuthorizeStartDto,
  JiraConnectionDto,
  JiraConnectionResponseDto,
  JiraProjectDto,
  MapJiraProjectRequest,
} from '../../models/integrations/jira.models';
import { BaseHttp } from '../http/base-http.service';

@Injectable({ providedIn: 'root' })
export class JiraIntegrationsService {
  private readonly api = inject(BaseHttp);

  async getConnection(projectId: string): Promise<JiraConnectionDto | null> {
    const response = await firstValueFrom(
      this.api.get<JiraConnectionResponseDto>(`api/projects/${projectId}/integrations/jira`),
    );
    return response?.connection ?? null;
  }

  startConnect(projectId: string): Promise<JiraAuthorizeStartDto> {
    return firstValueFrom(
      this.api.post<Record<string, never>, JiraAuthorizeStartDto>(
        `api/projects/${projectId}/integrations/jira/connect`,
        {},
      ),
    );
  }

  listSites(projectId: string): Promise<JiraAccessibleResourceDto[]> {
    return firstValueFrom(
      this.api.get<JiraAccessibleResourceDto[]>(
        `api/projects/${projectId}/integrations/jira/sites`,
      ),
    );
  }

  listProjects(projectId: string, cloudId?: string | null): Promise<JiraProjectDto[]> {
    const params: Record<string, string> = {};
    if (cloudId?.trim()) {
      params['cloudId'] = cloudId.trim();
    }
    return firstValueFrom(
      this.api.get<JiraProjectDto[]>(
        `api/projects/${projectId}/integrations/jira/projects`,
        params,
      ),
    );
  }

  mapProject(projectId: string, body: MapJiraProjectRequest): Promise<JiraConnectionDto> {
    return firstValueFrom(
      this.api.put<MapJiraProjectRequest, JiraConnectionDto>(
        `api/projects/${projectId}/integrations/jira/mapping`,
        body,
      ),
    );
  }

  disconnect(projectId: string): Promise<void> {
    return firstValueFrom(
      this.api.delete<void>(`api/projects/${projectId}/integrations/jira`),
    );
  }
}
