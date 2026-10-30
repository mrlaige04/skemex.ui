export type JiraConnectionStatus =
  | 'PendingProjectMapping'
  | 'Connected'
  | 'Error'
  | 'Disconnected'
  | string;

export interface JiraAuthorizeStartDto {
  authorizationUrl: string;
}

export interface JiraConnectionDto {
  id: string;
  projectId: string;
  status: JiraConnectionStatus;
  cloudId?: string | null;
  siteUrl?: string | null;
  siteName?: string | null;
  externalProjectId?: string | null;
  externalProjectKey?: string | null;
  externalProjectName?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface JiraConnectionResponseDto {
  connection: JiraConnectionDto | null;
}

export interface JiraAccessibleResourceDto {
  id: string;
  url: string;
  name: string;
  scopes: string[];
}

export interface JiraProjectDto {
  id: string;
  key: string;
  name: string;
  projectTypeKey?: string | null;
}

export interface MapJiraProjectRequest {
  cloudId: string;
  siteUrl?: string | null;
  siteName?: string | null;
  externalProjectId: string;
  externalProjectKey: string;
  externalProjectName: string;
}

export type JiraExportScope = 'AllFiltered' | 'Selected' | 'All';

export interface ExportTasksToJiraRequest {
  scope: JiraExportScope;
  selectedTaskIds?: string[];
  search?: string;
  columnId?: string | null;
  assigneeId?: string | null;
  unassigned?: boolean;
  skipAlreadyExported?: boolean;
}

export interface ExportTasksToJiraItemResultDto {
  taskId: string;
  taskCode: string;
  status: string;
  jiraIssueKey?: string | null;
  message?: string | null;
}

export interface ExportTasksToJiraResultDto {
  totalCandidates: number;
  exported: number;
  skipped: number;
  failed: number;
  items: ExportTasksToJiraItemResultDto[];
}

export interface JiraIssuePreviewDto {
  id: string;
  key: string;
  summary: string;
  issueType: string;
  status?: string | null;
  assigneeDisplayName?: string | null;
  parentKey?: string | null;
  alreadyImported: boolean;
  localTaskCode?: string | null;
}

export interface JiraUserDto {
  accountId: string;
  displayName?: string | null;
  emailAddress?: string | null;
  active: boolean;
  avatarUrl?: string | null;
}

export interface ImportTasksFromJiraRequest {
  importAll: boolean;
  issueKeys?: string[];
  skipAlreadyImported?: boolean;
}

export interface ImportTasksFromJiraItemResultDto {
  jiraIssueKey: string;
  status: string;
  localTaskCode?: string | null;
  localTaskId?: string | null;
  message?: string | null;
}

export interface ImportTasksFromJiraResultDto {
  totalCandidates: number;
  imported: number;
  skipped: number;
  failed: number;
  items: ImportTasksFromJiraItemResultDto[];
}
