export type IntegrationProviderKey = 'jira' | (string & {});

export interface IntegrationStatusDto {
  provider: string;
  isConfigured: boolean;
  hasConnection: boolean;
  status?: string | null;
}
