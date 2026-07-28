export interface ProjectUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

export interface AddProjectUserRequest {
  userId: string;
}

export interface ProjectDto {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  logoUrl?: string | null;
  createdAt: string;
}

export interface ProjectColumnDto {
  id: string;
  key: string;
  title: string;
  description?: string | null;
  sortOrder: number;
  isRequired: boolean;
  isSortOrderForced: boolean;
  forcedSortOrder?: number | null;
}

export interface ReorderProjectColumnsRequest {
  columnIds: string[];
}

export interface CreateProjectColumnRequest {
  tenantColumnId?: string | null;
  key?: string | null;
  title?: string | null;
  description?: string | null;
}

export interface UpdateProjectColumnRequest {
  title?: string | null;
  description?: string | null;
}

export interface ProjectSettingsDto {
  projectId: string;
  defaultTaskColumnId: string;
}

export interface UpdateProjectSettingsRequest {
  defaultTaskColumnId: string;
}

export interface CreateProjectRequest {
  name: string;
  code: string;
  description?: string | null;
  logo?: File | null;
}

export interface UpdateProjectRequest {
  name: string;
  description?: string | null;
}

export interface ProjectDocumentUserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ProjectDocumentDto {
  id: string;
  projectId: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  createdAt: string;
  downloadUrl?: string | null;
  uploadedBy: ProjectDocumentUserDto;
}

export type AiDecompositionJobStatus = 'Pending' | 'Running' | 'Succeeded' | 'Failed' | string;

export interface AiDecompositionJobDto {
  id: string;
  projectId: string;
  status: AiDecompositionJobStatus;
  userInput: string;
  customInstructions?: string | null;
  error?: string | null;
  rootTaskId?: string | null;
  rootTaskCode?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface EnqueueAiTaskDecompositionRequest {
  userInput: string;
  customInstructions?: string | null;
}

export interface ProjectTaskUserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
}

export interface ProjectTaskDto {
  id: string;
  projectId: string;
  projectColumnId: string;
  columnKey?: string;
  columnTitle?: string;
  parentId?: string | null;
  code: string;
  title: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  assignee?: ProjectTaskUserDto | null;
  reporter: ProjectTaskUserDto;
  subtasks: ProjectTaskDto[];
}

export type ProjectTaskSort =
  | 'createdAtDesc'
  | 'createdAtAsc'
  | 'titleAsc'
  | 'titleDesc'
  | 'codeAsc'
  | 'codeDesc';

export interface ListProjectTasksParams {
  search?: string;
  columnId?: string | null;
  assigneeId?: string | null;
  unassigned?: boolean;
  sort?: ProjectTaskSort;
  page?: number;
  pageSize?: number;
}

export interface UpdateProjectTaskRequest {
  columnId?: string | null;
  title?: string | null;
  description?: string | null;
  clearDescription?: boolean;
  assigneeId?: string | null;
  clearAssignee?: boolean;
}

export interface CreateProjectTaskRequest {
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  parentId?: string | null;
}
