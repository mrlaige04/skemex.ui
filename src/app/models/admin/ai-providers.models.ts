export type AiProviderAuthEntryType = 'header' | 'query';

export interface SaAiProviderAuthEntryDto {
  type: AiProviderAuthEntryType | string;
  name: string;
  hasValue: boolean;
}

export interface SaAiProviderDto {
  id: string;
  name: string;
  key: string;
  baseUrl: string;
  isEnabled: boolean;
  hasApiKey: boolean;
  authEntries: SaAiProviderAuthEntryDto[];
  createdAt: string;
  updatedAt?: string | null;
}

export interface SaAiProviderAuthEntryInput {
  type: AiProviderAuthEntryType | string;
  name: string;
  value?: string | null;
}

export interface CreateSaAiProviderRequest {
  name: string;
  key: string;
  baseUrl: string;
  isEnabled: boolean;
  authEntries: SaAiProviderAuthEntryInput[];
}

export interface UpdateSaAiProviderRequest {
  name: string;
  baseUrl: string;
  isEnabled: boolean;
  authEntries: SaAiProviderAuthEntryInput[];
}

export interface SaAiProviderModelDto {
  id: string;
  provider: string;
  providerName: string;
  externalId: string;
  displayName: string;
  author?: string | null;
  iconKey?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface UpdateSaAiProviderModelRequest {
  displayName: string;
  isActive: boolean;
}
