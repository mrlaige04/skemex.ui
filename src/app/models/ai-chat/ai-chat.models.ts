export type AiChatRole = 'user' | 'assistant' | 'system';

export interface AiModelDto {
  id: string;
  /** Provider key (slug). */
  provider: string;
  /** Provider display name for group labels. */
  providerName?: string | null;
  externalId: string;
  displayName: string;
  author?: string | null;
  iconKey?: string | null;
  isActive: boolean;
}

export interface AiModelProviderGroup {
  /** Provider key used for tracking/grouping. */
  provider: string;
  /** Display label shown in the select group header. */
  providerName: string;
  models: AiModelDto[];
}

export function groupAiModelsByProvider(models: AiModelDto[]): AiModelProviderGroup[] {
  const groups = new Map<string, AiModelDto[]>();
  for (const model of models) {
    const key = model.provider?.trim() || 'Other';
    const list = groups.get(key);
    if (list) {
      list.push(model);
    } else {
      groups.set(key, [model]);
    }
  }
  return [...groups.entries()].map(([provider, grouped]) => ({
    provider,
    providerName: grouped[0]?.providerName?.trim() || provider,
    models: grouped,
  }));
}

/** Known author icons under `/public/ai-authors/` (svg preferred, png when needed). */
const AUTHOR_ICON_FILES: Readonly<Record<string, string>> = {
  meta: 'meta.svg',
  openai: 'openai.svg',
  google: 'google.svg',
  'hugging-face': 'hugging-face.svg',
  'alibaba-cloud': 'alibaba-cloud.svg',
  groq: 'groq.png',
  sdaia: 'sdaia.png',
};

/** Public path for an author brand icon, or `null` to use the robot fallback. */
export function aiAuthorIconSrc(author: string | null | undefined): string | null {
  const slug = author
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) {
    return null;
  }
  const file = AUTHOR_ICON_FILES[slug];
  return file ? `/ai-authors/${file}` : null;
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
