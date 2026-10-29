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
