export interface TenantSettingsDto {
  tenantId: string;
  defaultAiModelId?: string | null;
  enrichmentAiModelId?: string | null;
  aiTemperature: number;
}

export interface UpdateTenantSettingsRequest {
  defaultAiModelId?: string | null;
  clearDefaultAiModel?: boolean;
  enrichmentAiModelId?: string | null;
  clearEnrichmentAiModel?: boolean;
  aiTemperature?: number;
}
