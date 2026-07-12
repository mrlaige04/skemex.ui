import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { PaginatedList } from '../../models/paginated-list';
import type {
  CreateProjectColumnRequest,
  CreateProjectRequest,
  CreateProjectTaskRequest,
  ProjectColumnDto,
  ProjectDto,
  ProjectSettingsDto,
  ProjectTaskDto,
  ProjectUserDto,
  ReorderProjectColumnsRequest,
  UpdateProjectColumnRequest,
  UpdateProjectSettingsRequest,
  UpdateProjectTaskRequest,
} from '../../models/projects/projects.models';
import type { TenantColumnDto } from '../../models/tenant-columns/tenant-columns.models';
import { BaseHttp } from '../http/base-http.service';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly api = inject(BaseHttp);

  list(search?: string, page = 1, pageSize = 10): Promise<PaginatedList<ProjectDto>> {
    const params: Record<string, string | number> = { page, pageSize };
    const term = search?.trim();
    if (term) {
      params['search'] = term;
    }

    return firstValueFrom(this.api.get<PaginatedList<ProjectDto>>('api/projects', params));
  }

  get(id: string): Promise<ProjectDto> {
    return firstValueFrom(this.api.get<ProjectDto>(`api/projects/${id}`));
  }

  async getByCode(code: string): Promise<ProjectDto | null> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      return null;
    }

    const page = await this.list(normalized, 1, 100);
    return page.items.find((project) => project.code.toUpperCase() === normalized) ?? null;
  }

  listColumns(projectId: string): Promise<ProjectColumnDto[]> {
    return firstValueFrom(
      this.api.get<ProjectColumnDto[]>(`api/projects/${projectId}/columns`),
    );
  }

  listAvailableColumns(projectId: string): Promise<TenantColumnDto[]> {
    return firstValueFrom(
      this.api.get<TenantColumnDto[]>(`api/projects/${projectId}/columns/available`),
    );
  }

  createColumn(projectId: string, body: CreateProjectColumnRequest): Promise<ProjectColumnDto> {
    return firstValueFrom(
      this.api.post<CreateProjectColumnRequest, ProjectColumnDto>(
        `api/projects/${projectId}/columns`,
        body,
      ),
    );
  }

  updateColumn(
    projectId: string,
    columnId: string,
    body: UpdateProjectColumnRequest,
  ): Promise<ProjectColumnDto> {
    return firstValueFrom(
      this.api.patch<UpdateProjectColumnRequest, ProjectColumnDto>(
        `api/projects/${projectId}/columns/${columnId}`,
        body,
      ),
    );
  }

  reorderColumns(projectId: string, body: ReorderProjectColumnsRequest): Promise<ProjectColumnDto[]> {
    return firstValueFrom(
      this.api.put<ReorderProjectColumnsRequest, ProjectColumnDto[]>(
        `api/projects/${projectId}/columns/reorder`,
        body,
      ),
    );
  }

  deleteColumn(projectId: string, columnId: string): Promise<void> {
    return firstValueFrom(
      this.api.delete<void>(`api/projects/${projectId}/columns/${columnId}`),
    );
  }

  listTasksByColumn(projectId: string, columnId: string): Promise<ProjectTaskDto[]> {
    return firstValueFrom(
      this.api.get<ProjectTaskDto[]>(`api/projects/${projectId}/columns/${columnId}/tasks`),
    );
  }

  createTask(projectId: string, body: CreateProjectTaskRequest): Promise<ProjectTaskDto> {
    return firstValueFrom(
      this.api.post<CreateProjectTaskRequest, ProjectTaskDto>(
        `api/projects/${projectId}/tasks`,
        body,
      ),
    );
  }

  getSettings(projectId: string): Promise<ProjectSettingsDto> {
    return firstValueFrom(
      this.api.get<ProjectSettingsDto>(`api/projects/${projectId}/settings`),
    );
  }

  updateSettings(
    projectId: string,
    body: UpdateProjectSettingsRequest,
  ): Promise<ProjectSettingsDto> {
    return firstValueFrom(
      this.api.patch<UpdateProjectSettingsRequest, ProjectSettingsDto>(
        `api/projects/${projectId}/settings`,
        body,
      ),
    );
  }

  deleteTask(projectId: string, columnId: string, taskId: string): Promise<void> {
    return firstValueFrom(
      this.api.delete<void>(`api/projects/${projectId}/columns/${columnId}/tasks/${taskId}`),
    );
  }

  updateTask(
    projectId: string,
    taskId: string,
    body: UpdateProjectTaskRequest,
  ): Promise<ProjectTaskDto> {
    return firstValueFrom(
      this.api.patch<UpdateProjectTaskRequest, ProjectTaskDto>(
        `api/projects/${projectId}/tasks/${taskId}`,
        body,
      ),
    );
  }

  listUsers(
    projectId: string,
    search?: string,
    page = 1,
    pageSize = 10,
  ): Promise<PaginatedList<ProjectUserDto>> {
    const params: Record<string, string | number> = { page, pageSize };
    const term = search?.trim();
    if (term) {
      params['search'] = term;
    }

    return firstValueFrom(
      this.api.get<PaginatedList<ProjectUserDto>>(`api/projects/${projectId}/users`, params),
    );
  }

  create(body: CreateProjectRequest): Promise<ProjectDto> {
    const fd = new FormData();
    fd.append('name', body.name.trim());
    fd.append('code', body.code.trim());
    const description = body.description?.trim();
    if (description) {
      fd.append('description', description);
    }
    if (body.logo && body.logo.size > 0) {
      fd.append('logo', body.logo, body.logo.name);
    }

    return firstValueFrom(this.api.postFormData<ProjectDto>('api/projects', fd));
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.api.delete<void>(`api/projects/${id}`));
  }
}
