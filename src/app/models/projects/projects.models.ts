export interface ProjectUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
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

export interface ProjectTaskUserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ProjectTaskDto {
  id: string;
  projectId: string;
  projectColumnId: string;
  parentId?: string | null;
  code: string;
  title: string;
  description?: string | null;
  assignee?: ProjectTaskUserDto | null;
  reporter: ProjectTaskUserDto;
  subtasks: ProjectTaskDto[];
}

export interface UpdateProjectTaskRequest {
  columnId: string;
}

export interface CreateProjectTaskRequest {
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  parentId?: string | null;
}
