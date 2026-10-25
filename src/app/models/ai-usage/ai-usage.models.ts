export type AiUsageOperationType =
  | 'ChatCompletion'
  | 'FunctionCall'
  | 'Embedding'
  | 'ToolExecution';

export type AiUsageActivitySort =
  | 'createdAtDesc'
  | 'createdAtAsc'
  | 'totalTokensDesc'
  | 'totalTokensAsc'
  | 'durationMsDesc'
  | 'durationMsAsc';

export interface AiUsageActivityDto {
  id: string;
  correlationId: string;
  parentActivityId: string | null;
  operationType: AiUsageOperationType | string;
  operationName: string;
  provider: string | null;
  model: string | null;
  toolName: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  inputItemCount: number | null;
  success: boolean;
  errorMessage: string | null;
  durationMs: number;
  createdAt: string;
  userId: string;
  userDisplayName: string;
  userEmail: string | null;
}

export interface AiUsageNamedCountDto {
  name: string;
  count: number;
  totalTokens: number;
  averageLatencyMs: number;
}

export interface AiUsageDailyPointDto {
  date: string;
  operations: number;
  totalTokens: number;
  averageLatencyMs: number;
}

export interface ProjectAiUsageSummaryDto {
  fromUtc: string;
  toUtc: string;
  totalOperations: number;
  successfulOperations: number;
  successRate: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  averageLatencyMs: number;
  embeddingOperations: number;
  toolExecutions: number;
  chatCompletions: number;
  functionCalls: number;
  byOperationType: AiUsageNamedCountDto[];
  byOperationName: AiUsageNamedCountDto[];
  byModel: AiUsageNamedCountDto[];
  daily: AiUsageDailyPointDto[];
}

export type AiExecutionSource = 'Chat' | 'Ui' | 'Api' | 'Documents' | string;

export type AiExecutionStatus =
  | 'Pending'
  | 'Running'
  | 'Succeeded'
  | 'Failed'
  | string;

export interface AiUsageGroupDto {
  id: string;
  /** Same as id; kept for older clients. */
  correlationId: string;
  title: string;
  source: AiExecutionSource;
  contextLabel: string;
  status: AiExecutionStatus;
  startedAt: string;
  endedAt: string | null;
  operationCount: number;
  toolCount: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
  success: boolean;
  userId: string;
  userDisplayName: string;
  userEmail: string | null;
  operationTypes: string[];
  toolNames: string[];
  activities: AiUsageActivityDto[];
}

export interface ListAiUsageParams {
  search?: string;
  operationType?: string;
  operationName?: string;
  success?: boolean;
  userId?: string;
  from?: string;
  to?: string;
  sort?: AiUsageActivitySort;
  page?: number;
  pageSize?: number;
}
