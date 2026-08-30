import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { PaginatedList } from '../../models/paginated-list';
import type {
  CreateProjectColumnRequest,
  CreateProjectRequest,
  CreateProjectTaskRequest,
  EnqueueAiTaskDecompositionRequest,
  AiDecompositionJobDto,
  ListProjectTasksParams,
  ProjectColumnDto,
  ProjectDocumentDto,
  ProjectDto,
  ProjectSettingsDto,
  ProjectTaskDto,
  ProjectUserDto,
  ReorderProjectColumnsRequest,
  UpdateProjectColumnRequest,
  UpdateProjectRequest,
  UpdateProjectSettingsRequest,
  UpdateProjectTaskRequest,
} from '../../models/projects/projects.models';
import type {
  AiChatDto,
  AiChatMessageDto,
  AiChatSummaryDto,
  CreateAiChatRequest,
  UpdateAiChatRequest,
  CreateAiChatMessageRequest,
  UpdateAiChatMessageRequest,
} from '../../models/ai-chat/ai-chat.models';
import type { TenantColumnDto } from '../../models/tenant-columns/tenant-columns.models';
import { BaseHttp } from '../http/base-http.service';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly api = inject(BaseHttp);
  /** Dedupes concurrent resolve-by-code lookups (guard + layout + tabs). */
  private readonly byCodeInflight = new Map<string, Promise<ProjectDto | null>>();

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

  update(id: string, body: UpdateProjectRequest): Promise<ProjectDto> {
    return firstValueFrom(
      this.api.patch<UpdateProjectRequest, ProjectDto>(`api/projects/${id}`, body),
    );
  }

  async getByCode(code: string): Promise<ProjectDto | null> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      return null;
    }

    const inflight = this.byCodeInflight.get(normalized);
    if (inflight) {
      return inflight;
    }

    const request = this.list(normalized, 1, 100)
      .then(
        (page) =>
          page.items.find((project) => project.code.toUpperCase() === normalized) ?? null,
      )
      .finally(() => {
        this.byCodeInflight.delete(normalized);
      });

    this.byCodeInflight.set(normalized, request);
    return request;
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

  listTasks(
    projectId: string,
    params: ListProjectTasksParams = {},
  ): Promise<PaginatedList<ProjectTaskDto>> {
    const query: Record<string, string | number | boolean> = {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 10,
      sort: params.sort ?? 'createdAtDesc',
    };

    const search = params.search?.trim();
    if (search) {
      query['search'] = search;
    }
    if (params.columnId) {
      query['columnId'] = params.columnId;
    }
    if (params.unassigned) {
      query['unassigned'] = true;
    } else if (params.assigneeId) {
      query['assigneeId'] = params.assigneeId;
    }

    return firstValueFrom(
      this.api.get<PaginatedList<ProjectTaskDto>>(`api/projects/${projectId}/tasks`, query),
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

  getTaskByCode(projectId: string, code: string): Promise<ProjectTaskDto> {
    const normalized = encodeURIComponent(code.trim());
    return firstValueFrom(
      this.api.get<ProjectTaskDto>(`api/projects/${projectId}/tasks/by-code/${normalized}`),
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

  bulkDeleteTasks(projectId: string, taskIds: string[]): Promise<void> {
    return firstValueFrom(
      this.api.post<{ taskIds: string[] }, void>(`api/projects/${projectId}/tasks/bulk-delete`, {
        taskIds,
      }),
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

  addUser(projectId: string, userId: string): Promise<ProjectUserDto> {
    return firstValueFrom(
      this.api.post<{ userId: string }, ProjectUserDto>(`api/projects/${projectId}/users`, {
        userId,
      }),
    );
  }

  removeUser(projectId: string, userId: string): Promise<void> {
    return firstValueFrom(
      this.api.delete<void>(`api/projects/${projectId}/users/${userId}`),
    );
  }

  listDocuments(
    projectId: string,
    search?: string,
    page = 1,
    pageSize = 10,
  ): Promise<PaginatedList<ProjectDocumentDto>> {
    const params: Record<string, string | number> = { page, pageSize };
    const term = search?.trim();
    if (term) {
      params['search'] = term;
    }

    return firstValueFrom(
      this.api.get<PaginatedList<ProjectDocumentDto>>(`api/projects/${projectId}/documents`, params),
    );
  }

  uploadDocument(projectId: string, file: File): Promise<ProjectDocumentDto> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return firstValueFrom(
      this.api.postFormData<ProjectDocumentDto>(`api/projects/${projectId}/documents`, fd),
    );
  }

  deleteDocument(projectId: string, documentId: string): Promise<void> {
    return firstValueFrom(
      this.api.delete<void>(`api/projects/${projectId}/documents/${documentId}`),
    );
  }

  getDocument(projectId: string, documentId: string): Promise<ProjectDocumentDto> {
    return firstValueFrom(
      this.api.get<ProjectDocumentDto>(`api/projects/${projectId}/documents/${documentId}`),
    );
  }

  enqueueAiDecompose(
    projectId: string,
    body: EnqueueAiTaskDecompositionRequest,
  ): Promise<AiDecompositionJobDto> {
    return firstValueFrom(
      this.api.post<EnqueueAiTaskDecompositionRequest, AiDecompositionJobDto>(
        `api/projects/${projectId}/ai/decompose`,
        body,
      ),
    );
  }

  enqueueAiChatDecompose(
    projectId: string,
    chatId: string,
    body: EnqueueAiTaskDecompositionRequest,
  ): Promise<AiDecompositionJobDto> {
    return firstValueFrom(
      this.api.post<EnqueueAiTaskDecompositionRequest, AiDecompositionJobDto>(
        `api/projects/${projectId}/ai/chats/${chatId}/decompose`,
        body,
      ),
    );
  }

  getAiDecomposeJob(projectId: string, jobId: string): Promise<AiDecompositionJobDto> {
    return firstValueFrom(
      this.api.get<AiDecompositionJobDto>(`api/projects/${projectId}/ai/decompose/${jobId}`),
    );
  }

  listAiChats(projectId: string): Promise<AiChatSummaryDto[]> {
    return firstValueFrom(this.api.get<AiChatSummaryDto[]>(`api/projects/${projectId}/ai/chats`));
  }

  createAiChat(projectId: string, body: CreateAiChatRequest = {}): Promise<AiChatDto> {
    return firstValueFrom(
      this.api.post<CreateAiChatRequest, AiChatDto>(`api/projects/${projectId}/ai/chats`, body),
    );
  }

  getAiChat(projectId: string, chatId: string): Promise<AiChatDto> {
    return firstValueFrom(
      this.api.get<AiChatDto>(`api/projects/${projectId}/ai/chats/${chatId}`),
    );
  }

  updateAiChat(
    projectId: string,
    chatId: string,
    body: UpdateAiChatRequest,
  ): Promise<AiChatSummaryDto> {
    return firstValueFrom(
      this.api.put<UpdateAiChatRequest, AiChatSummaryDto>(
        `api/projects/${projectId}/ai/chats/${chatId}`,
        body,
      ),
    );
  }

  deleteAiChat(projectId: string, chatId: string): Promise<void> {
    return firstValueFrom(
      this.api.delete<void>(`api/projects/${projectId}/ai/chats/${chatId}`),
    );
  }

  createAiChatMessage(
    projectId: string,
    chatId: string,
    body: CreateAiChatMessageRequest,
  ): Promise<AiChatMessageDto> {
    return firstValueFrom(
      this.api.post<CreateAiChatMessageRequest, AiChatMessageDto>(
        `api/projects/${projectId}/ai/chats/${chatId}/messages`,
        body,
      ),
    );
  }

  updateAiChatMessage(
    projectId: string,
    chatId: string,
    messageId: string,
    body: UpdateAiChatMessageRequest,
  ): Promise<AiChatMessageDto> {
    return firstValueFrom(
      this.api.put<UpdateAiChatMessageRequest, AiChatMessageDto>(
        `api/projects/${projectId}/ai/chats/${chatId}/messages/${messageId}`,
        body,
      ),
    );
  }

  deleteAiChatMessage(projectId: string, chatId: string, messageId: string): Promise<void> {
    return firstValueFrom(
      this.api.delete<void>(`api/projects/${projectId}/ai/chats/${chatId}/messages/${messageId}`),
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
