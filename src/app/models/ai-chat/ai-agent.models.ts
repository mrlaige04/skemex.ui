export type AiExecutionSource = 'Chat' | 'Ui' | 'Api' | 'Documents';

export type AiChatArtefactType = 'task' | 'user' | 'document';

export interface AiChatArtefactRefDto {
  number: number;
  type: AiChatArtefactType;
  entityId: string;
}

export interface ExecuteAiRequest {
  toolName?: string | null;
  projectId?: string | null;
  chatId?: string | null;
  userInput: string;
  argumentsJson?: string | null;
  /** Provider model external id (e.g. llama-3.3-70b-versatile). */
  model?: string | null;
  /** Origin of the call; inferred by API when omitted. */
  source?: AiExecutionSource | null;
  /** Linked project artefacts referenced as `{artefact:N}` in userInput. */
  artefacts?: AiChatArtefactRefDto[] | null;
}

export type AiAgentJobStatus = 'Pending' | 'Running' | 'Succeeded' | 'Failed' | string;

export interface AiAgentJobDto {
  id: string;
  projectId?: string | null;
  toolName?: string | null;
  status: AiAgentJobStatus;
  userInput: string;
  error?: string | null;
  assistantMessage?: string | null;
  artifactType?: string | null;
  artifactPayloadJson?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}
