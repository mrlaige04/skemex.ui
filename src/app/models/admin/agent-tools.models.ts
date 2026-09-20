export interface SaAgentToolSummaryDto {
  id: string;
  systemName: string;
  description: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface SaAgentToolDto extends SaAgentToolSummaryDto {
  systemPrompt: string;
}

export interface UpdateSaAgentToolRequest {
  description?: string;
  systemPrompt?: string;
}
