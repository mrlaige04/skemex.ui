import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  ExportTasksToJiraRequest,
  ExportTasksToJiraResultDto,
  ImportTasksFromJiraRequest,
  ImportTasksFromJiraResultDto,
  JiraAccessibleResourceDto,
  JiraAuthorizeStartDto,
  JiraConnectionDto,
  JiraConnectionResponseDto,
  JiraEntityMappingWorkspaceDto,
  JiraIssuePreviewDto,
  JiraMappingLinkDto,
  JiraProjectDto,
  JiraUserDto,
  MapJiraProjectRequest,
  UpdateJiraWebhookSettingsRequest,
  UpsertJiraEntityMappingRequest,
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

  updateWebhookSettings(
    projectId: string,
    body: UpdateJiraWebhookSettingsRequest,
  ): Promise<JiraConnectionDto> {
    return firstValueFrom(
      this.api.put<UpdateJiraWebhookSettingsRequest, JiraConnectionDto>(
        `api/projects/${projectId}/integrations/jira/webhook-settings`,
        body,
      ),
    );
  }

  exportTasks(
    projectId: string,
    body: ExportTasksToJiraRequest,
  ): Promise<ExportTasksToJiraResultDto> {
    return firstValueFrom(
      this.api.post<ExportTasksToJiraRequest, ExportTasksToJiraResultDto>(
        `api/projects/${projectId}/integrations/jira/export-tasks`,
        body,
      ),
    );
  }

  listRemoteIssues(projectId: string): Promise<JiraIssuePreviewDto[]> {
    return firstValueFrom(
      this.api.get<JiraIssuePreviewDto[]>(`api/projects/${projectId}/integrations/jira/issues`),
    );
  }

  listRemoteUsers(projectId: string): Promise<JiraUserDto[]> {
    return firstValueFrom(
      this.api.get<JiraUserDto[]>(`api/projects/${projectId}/integrations/jira/users`),
    );
  }

  importTasks(
    projectId: string,
    body: ImportTasksFromJiraRequest,
  ): Promise<ImportTasksFromJiraResultDto> {
    return firstValueFrom(
      this.api.post<ImportTasksFromJiraRequest, ImportTasksFromJiraResultDto>(
        `api/projects/${projectId}/integrations/jira/import-tasks`,
        body,
      ),
    );
  }

  getEntityMappings(
    projectId: string,
    localEntityType: string,
  ): Promise<JiraEntityMappingWorkspaceDto> {
    return firstValueFrom(
      this.api.get<JiraEntityMappingWorkspaceDto>(
        `api/projects/${projectId}/integrations/jira/entity-mappings`,
        { localEntityType },
      ),
    );
  }

  upsertEntityMapping(
    projectId: string,
    body: UpsertJiraEntityMappingRequest,
  ): Promise<JiraMappingLinkDto> {
    return firstValueFrom(
      this.api.put<UpsertJiraEntityMappingRequest, JiraMappingLinkDto>(
        `api/projects/${projectId}/integrations/jira/entity-mappings`,
        body,
      ),
    );
  }

  deleteEntityMapping(projectId: string, mappingId: string): Promise<void> {
    return firstValueFrom(
      this.api.delete<void>(
        `api/projects/${projectId}/integrations/jira/entity-mappings/${mappingId}`,
      ),
    );
  }
}
