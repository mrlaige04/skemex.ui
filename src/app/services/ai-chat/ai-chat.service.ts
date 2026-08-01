import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { problemDetailMessage } from '../../http/problem-details';
import type {
  AiChatDto,
  AiChatMessage,
  AiChatMessageDto,
  AiChatRole,
  AiChatSummaryDto,
  AiChatThread,
} from '../../models/ai-chat/ai-chat.models';
import { APP_PATHS } from '../../routing/app-paths';
import { ProjectsService } from '../projects/projects.service';

const OPEN_KEY = 'skemex.aiChat.open';
const activeKey = (projectId: string) => `skemex.aiChat.active.${projectId}`;

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AiChatService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly projectsService = inject(ProjectsService);

  private readonly _open = signal(false);
  private readonly _historyOpen = signal(false);
  private readonly _sending = signal(false);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _threads = signal<AiChatThread[]>([]);
  private readonly _activeThreadId = signal<string | null>(null);
  private readonly _projectId = signal<string | null>(null);
  private readonly _projectCode = signal<string | null>(null);
  private loadToken = 0;

  readonly open = this._open.asReadonly();
  readonly historyOpen = this._historyOpen.asReadonly();
  readonly sending = this._sending.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly threads = this._threads.asReadonly();

  readonly activeThread = computed(() => {
    const id = this._activeThreadId();
    return this._threads().find((t) => t.id === id) ?? null;
  });

  readonly messages = computed(() => {
    const active = this.activeThread();
    if (!active) {
      return [this.welcomeMessage()];
    }
    if (!active.messagesLoaded || active.messages.length === 0) {
      return [this.welcomeMessage()];
    }
    return active.messages;
  });

  readonly historyThreads = computed(() =>
    [...this._threads()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
  );

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this._open.set(sessionStorage.getItem(OPEN_KEY) === '1');
    }
  }

  setProjectContext(projectId: string | null, projectCode: string | null): void {
    const nextId = projectId?.trim() || null;
    this._projectId.set(nextId);
    this._projectCode.set(projectCode?.trim() || null);
    this._historyOpen.set(false);
    this._sending.set(false);
    this._error.set(null);
    this.loadToken += 1;

    if (!nextId) {
      this._threads.set([]);
      this._activeThreadId.set(null);
      this._loading.set(false);
      return;
    }

    void this.loadProject(nextId, this.loadToken);
  }

  toggle(): void {
    this.setOpen(!this._open());
  }

  setOpen(open: boolean): void {
    this._open.set(open);
    if (!open) {
      this._historyOpen.set(false);
    }
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(OPEN_KEY, open ? '1' : '0');
    }
  }

  toggleHistory(): void {
    this._historyOpen.update((v) => !v);
  }

  setHistoryOpen(open: boolean): void {
    this._historyOpen.set(open);
  }

  async openThread(threadId: string): Promise<void> {
    if (!this._threads().some((t) => t.id === threadId)) {
      return;
    }
    this._activeThreadId.set(threadId);
    this._historyOpen.set(false);
    this.rememberActive(this._projectId(), threadId);
    await this.ensureMessagesLoaded(threadId);
  }

  async renameThread(threadId: string, rawTitle: string): Promise<void> {
    const projectId = this._projectId();
    if (!projectId) {
      return;
    }

    const title = rawTitle.trim() || 'Untitled chat';
    const clipped = title.length > 80 ? `${title.slice(0, 77).trim()}…` : title;

    try {
      const updated = await this.projectsService.updateAiChat(projectId, threadId, {
        title: clipped,
      });
      this._threads.update((list) =>
        list.map((t) =>
          t.id === threadId
            ? {
                ...t,
                title: updated.title,
                updatedAt: updated.updatedAt ?? updated.createdAt,
              }
            : t,
        ),
      );
    } catch (err) {
      this._error.set(problemDetailMessage(err as HttpErrorResponse));
    }
  }

  async deleteThread(threadId: string): Promise<void> {
    const projectId = this._projectId();
    if (!projectId) {
      return;
    }

    try {
      await this.projectsService.deleteAiChat(projectId, threadId);
      let remaining = this._threads().filter((t) => t.id !== threadId);

      if (remaining.length === 0) {
        const created = await this.projectsService.createAiChat(projectId);
        remaining = [this.summaryToThread(created)];
        this._threads.set(remaining);
        this._activeThreadId.set(created.id);
        this.rememberActive(projectId, created.id);
        return;
      }

      this._threads.set(remaining);
      if (this._activeThreadId() === threadId) {
        const next =
          [...remaining].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ??
          remaining[0];
        this._activeThreadId.set(next.id);
        this.rememberActive(projectId, next.id);
        await this.ensureMessagesLoaded(next.id);
      }
    } catch (err) {
      this._error.set(problemDetailMessage(err as HttpErrorResponse));
    }
  }

  async newChat(): Promise<void> {
    const projectId = this._projectId();
    if (!projectId) {
      return;
    }

    try {
      const created = await this.projectsService.createAiChat(projectId);
      const thread = this.summaryToThread(created);
      this._threads.update((list) => [thread, ...list]);
      this._activeThreadId.set(thread.id);
      this._historyOpen.set(false);
      this.rememberActive(projectId, thread.id);
    } catch (err) {
      this._error.set(problemDetailMessage(err as HttpErrorResponse));
    }
  }

  async clear(): Promise<void> {
    const active = this.activeThread();
    if (!active) {
      await this.newChat();
      return;
    }

    const hasUser = active.messages.some((m) => m.role === 'user');
    if (hasUser || active.messagesLoaded) {
      await this.newChat();
    }
  }

  async send(raw: string): Promise<void> {
    const content = raw.trim();
    if (!content || this._sending()) {
      return;
    }

    const projectId = this._projectId();
    const projectCode = this._projectCode();
    if (!projectId || !projectCode) {
      this.appendLocalAssistant(
        'Open a project first — AI decomposition runs in the context of the current project.',
      );
      return;
    }

    this._sending.set(true);
    this._error.set(null);

    try {
      let chatId = this._activeThreadId();
      if (!chatId) {
        const created = await this.projectsService.createAiChat(projectId);
        const thread = this.summaryToThread(created);
        this._threads.set([thread]);
        chatId = created.id;
        this._activeThreadId.set(chatId);
        this.rememberActive(projectId, chatId);
      }

      await this.ensureMessagesLoaded(chatId);

      this.appendLocalMessage({
        id: `local-user-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      });
      this.appendLocalAssistant('Got it — queuing decomposition for this project…');

      const job = await this.projectsService.enqueueAiChatDecompose(projectId, chatId, {
        userInput: content,
      });

      this.replaceLastAssistant(
        `Job queued (${job.status}). Working with the model — this can take a minute…`,
      );

      const finished = await this.pollJob(projectId, job.id);
      await this.reloadActiveChat(projectId, chatId, projectCode);

      if (finished.timedOut) {
        this.appendLocalAssistant(
          finished.error?.trim() ||
            'Timed out waiting for AI decomposition. Check Issues later or try again.',
        );
      }
    } catch (err) {
      this.replaceLastAssistant(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this._sending.set(false);
    }
  }

  private async loadProject(projectId: string, token: number): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      this._threads.set([]);
      this._activeThreadId.set(null);
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      let summaries = await this.projectsService.listAiChats(projectId);
      if (token !== this.loadToken) {
        return;
      }

      if (summaries.length === 0) {
        const created = await this.projectsService.createAiChat(projectId);
        if (token !== this.loadToken) {
          return;
        }
        summaries = [created];
      }

      const threads = summaries.map((s) => this.summaryToThread(s));
      this._threads.set(threads);

      const savedActive = sessionStorage.getItem(activeKey(projectId));
      const activeId =
        (savedActive && threads.find((t) => t.id === savedActive)?.id) || threads[0]?.id || null;
      this._activeThreadId.set(activeId);
      if (activeId) {
        this.rememberActive(projectId, activeId);
        await this.ensureMessagesLoaded(activeId, token);
      }
    } catch (err) {
      if (token !== this.loadToken) {
        return;
      }
      this._error.set(problemDetailMessage(err as HttpErrorResponse));
      this._threads.set([]);
      this._activeThreadId.set(null);
    } finally {
      if (token === this.loadToken) {
        this._loading.set(false);
      }
    }
  }

  private async ensureMessagesLoaded(threadId: string, token = this.loadToken): Promise<void> {
    const projectId = this._projectId();
    const projectCode = this._projectCode();
    if (!projectId || !projectCode) {
      return;
    }

    const thread = this._threads().find((t) => t.id === threadId);
    if (!thread || thread.messagesLoaded) {
      return;
    }

    try {
      const detail = await this.projectsService.getAiChat(projectId, threadId);
      if (token !== this.loadToken) {
        return;
      }
      this.applyChatDetail(detail, projectCode);
    } catch (err) {
      if (token !== this.loadToken) {
        return;
      }
      this._error.set(problemDetailMessage(err as HttpErrorResponse));
    }
  }

  private async reloadActiveChat(
    projectId: string,
    chatId: string,
    projectCode: string,
  ): Promise<void> {
    const detail = await this.projectsService.getAiChat(projectId, chatId);
    this.applyChatDetail(detail, projectCode);

    // Refresh summary ordering/title from list cheaply
    this._threads.update((list) =>
      list.map((t) =>
        t.id === chatId
          ? {
              ...t,
              title: detail.title,
              updatedAt: detail.updatedAt ?? detail.createdAt,
            }
          : t,
      ),
    );
  }

  private applyChatDetail(detail: AiChatDto, projectCode: string): void {
    const messages = detail.messages.map((m) => this.mapMessage(m, projectCode));
    this._threads.update((list) =>
      list.map((t) =>
        t.id === detail.id
          ? {
              ...t,
              title: detail.title,
              createdAt: detail.createdAt,
              updatedAt: detail.updatedAt ?? detail.createdAt,
              messages,
              messagesLoaded: true,
            }
          : t,
      ),
    );
  }

  private mapMessage(dto: AiChatMessageDto, projectCode: string): AiChatMessage {
    const role = dto.role.toLowerCase() as AiChatRole;
    const code = dto.rootTaskCode?.trim();
    return {
      id: dto.id,
      role: role === 'user' || role === 'system' ? role : 'assistant',
      content: dto.content,
      createdAt: dto.createdAt,
      linkHref: code ? APP_PATHS.projectIssue(projectCode, code) : null,
      linkLabel: code ? `Open ${code}` : null,
    };
  }

  private summaryToThread(summary: AiChatSummaryDto | AiChatDto): AiChatThread {
    return {
      id: summary.id,
      title: summary.title,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt ?? summary.createdAt,
      messages: [],
      messagesLoaded: false,
    };
  }

  private rememberActive(projectId: string | null, chatId: string): void {
    if (!projectId || !isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      sessionStorage.setItem(activeKey(projectId), chatId);
    } catch {
      // ignore
    }
  }

  private async pollJob(
    projectId: string,
    jobId: string,
  ): Promise<{ status: string; error?: string | null; timedOut: boolean }> {
    const started = Date.now();
    while (Date.now() - started < POLL_TIMEOUT_MS) {
      await delay(POLL_INTERVAL_MS);
      const job = await this.projectsService.getAiDecomposeJob(projectId, jobId);
      if (job.status === 'Succeeded' || job.status === 'Failed') {
        return { status: job.status, error: job.error, timedOut: false };
      }
      this.replaceLastAssistant(`Still working… (status: ${job.status})`);
    }

    return {
      status: 'Failed',
      timedOut: true,
      error: 'Timed out waiting for AI decomposition. Check Issues later or try again.',
    };
  }

  private welcomeMessage(): AiChatMessage {
    return {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi — I’m Skemex AI. Describe a goal or epic, and I’ll decompose it into clear subtasks on this project’s board.',
      createdAt: new Date().toISOString(),
    };
  }

  private appendLocalMessage(message: AiChatMessage): void {
    const id = this._activeThreadId();
    if (!id) {
      return;
    }
    this._threads.update((list) =>
      list.map((t) =>
        t.id === id
          ? {
              ...t,
              messages: [...t.messages, message],
              messagesLoaded: true,
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    );
  }

  private appendLocalAssistant(content: string): void {
    this.appendLocalMessage({
      id: `local-assistant-${Date.now()}`,
      role: 'assistant',
      content,
      createdAt: new Date().toISOString(),
    });
  }

  private replaceLastAssistant(content: string): void {
    const id = this._activeThreadId();
    if (!id) {
      return;
    }
    this._threads.update((list) =>
      list.map((t) => {
        if (t.id !== id) {
          return t;
        }
        const next = [...t.messages];
        for (let i = next.length - 1; i >= 0; i -= 1) {
          if (next[i].role === 'assistant') {
            next[i] = { ...next[i], content, createdAt: new Date().toISOString() };
            return { ...t, messages: next, updatedAt: new Date().toISOString() };
          }
        }
        next.push({
          id: `local-assistant-${Date.now()}`,
          role: 'assistant',
          content,
          createdAt: new Date().toISOString(),
        });
        return { ...t, messages: next, updatedAt: new Date().toISOString() };
      }),
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
