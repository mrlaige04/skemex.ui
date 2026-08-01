export type AiChatRole = 'user' | 'assistant' | 'system';

export interface AiModelDto {
  id: string;
  provider: string;
  externalId: string;
  displayName: string;
  iconKey?: string | null;
  isActive: boolean;
}

export interface AiChatMessageDto {
  id: string;
  chatId: string;
  role: string;
  content: string;
  decompositionJobId?: string | null;
  rootTaskId?: string | null;
  rootTaskCode?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface AiChatSummaryDto {
  id: string;
  projectId: string;
  title: string;
  aiModelId?: string | null;
  aiModel?: AiModelDto | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface AiChatDto {
  id: string;
  projectId: string;
  title: string;
  aiModelId?: string | null;
  aiModel?: AiModelDto | null;
  createdAt: string;
  updatedAt?: string | null;
  messages: AiChatMessageDto[];
}

export interface CreateAiChatRequest {
  title?: string | null;
  aiModelId?: string | null;
}

export interface UpdateAiChatRequest {
  title?: string | null;
  aiModelId?: string | null;
  clearAiModel?: boolean;
}

export interface CreateAiChatMessageRequest {
  role?: string;
  content: string;
}

export interface UpdateAiChatMessageRequest {
  content: string;
}

/** UI view model for a message bubble. */
export interface AiChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
  createdAt: string;
  linkHref?: string | null;
  linkLabel?: string | null;
}

/** UI view model for a chat thread (summary + loaded messages). */
export interface AiChatThread {
  id: string;
  title: string;
  aiModelId: string | null;
  aiModel: AiModelDto | null;
  createdAt: string;
  updatedAt: string;
  messages: AiChatMessage[];
  messagesLoaded: boolean;
}
