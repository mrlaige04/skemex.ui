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

export interface AiChatMessageAttachmentDto {
  id: string;
  chatId: string;
  messageId: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface AiChatMessageDto {
  id: string;
  chatId: string;
  role: string;
  content: string;
  rootTaskId?: string | null;
  rootTaskCode?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  attachments?: AiChatMessageAttachmentDto[];
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

/** Render unit for the chat panel: normal bubble or animated progress feed. */
export type AiChatDisplayItem =
  | { kind: 'message'; id: string; message: AiChatMessage }
  | { kind: 'progress'; id: string; steps: AiChatMessage[] };

/** Group consecutive system notes into a progress feed; keep other roles as bubbles. */
export function toAiChatDisplayItems(messages: AiChatMessage[]): AiChatDisplayItem[] {
  const items: AiChatDisplayItem[] = [];
  let index = 0;

  while (index < messages.length) {
    const current = messages[index];
    if (current.role !== 'system') {
      items.push({ kind: 'message', id: current.id, message: current });
      index += 1;
      continue;
    }

    const steps: AiChatMessage[] = [];
    while (index < messages.length && messages[index].role === 'system') {
      const systemMessage = messages[index];
      const lines = systemMessage.content
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length <= 1) {
        steps.push(systemMessage);
      } else {
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
          steps.push({
            ...systemMessage,
            id: `${systemMessage.id}:${lineIndex}`,
            content: lines[lineIndex],
          });
        }
      }
      index += 1;
    }

    if (steps.length > 0) {
      items.push({ kind: 'progress', id: `progress-${steps[0].id}`, steps });
    }
  }

  return items;
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
