import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { problemDetailMessage } from '../../http/problem-details';
import { APP_PATHS } from '../../routing/app-paths';
import { ProjectsService } from '../projects/projects.service';

export type AiChatRole = 'user' | 'assistant' | 'system';

export interface AiChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
  createdAt: string;
  linkHref?: string | null;
  linkLabel?: string | null;
}

export interface AiChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiChatMessage[];
}

const OPEN_KEY = 'skemex.aiChat.open';
const threadsKey = (projectId: string) => `skemex.aiChat.threads.${projectId}`;
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
  private readonly _threads = signal<AiChatThread[]>([]);
  private readonly _activeThreadId = signal<string | null>(null);
  private readonly _projectId = signal<string | null>(null);
  private readonly _projectCode = signal<string | null>(null);

  readonly open = this._open.asReadonly();
  readonly historyOpen = this._historyOpen.asReadonly();
  readonly sending = this._sending.asReadonly();
  readonly threads = this._threads.asReadonly();

  readonly activeThread = computed(() => {
    const id = this._activeThreadId();
    return this._threads().find((t) => t.id === id) ?? null;
  });

  readonly messages = computed(() => this.activeThread()?.messages ?? [this.welcomeMessage()]);

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
    const prevId = this._projectId();
    if (prevId && prevId !== nextId) {
      this.persistProject(prevId);
    }

    this._projectId.set(nextId);
    this._projectCode.set(projectCode?.trim() || null);
    this._historyOpen.set(false);
    this._sending.set(false);

    if (!nextId) {
      this._threads.set([]);
      this._activeThreadId.set(null);
      return;
    }

    this.loadProject(nextId);
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

  openThread(threadId: string): void {
    if (!this._threads().some((t) => t.id === threadId)) {
      return;
    }
    this._activeThreadId.set(threadId);
    this._historyOpen.set(false);
    this.persistProject(this._projectId());
  }

  renameThread(threadId: string, rawTitle: string): void {
    const title = rawTitle.trim() || 'Untitled chat';
    const clipped = title.length > 80 ? `${title.slice(0, 77).trim()}…` : title;
    this._threads.update((list) =>
      list.map((t) =>
        t.id === threadId
          ? { ...t, title: clipped, updatedAt: new Date().toISOString() }
          : t,
      ),
    );
    this.persistProject(this._projectId());
  }

  deleteThread(threadId: string): void {
    const remaining = this._threads().filter((t) => t.id !== threadId);
    if (remaining.length === 0) {
      const thread = this.createThread();
      this._threads.set([thread]);
      this._activeThreadId.set(thread.id);
      this.persistProject(this._projectId());
      return;
    }

    this._threads.set(remaining);
    if (this._activeThreadId() === threadId) {
      const next =
        [...remaining].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ??
        remaining[0];
      this._activeThreadId.set(next.id);
    }
    this.persistProject(this._projectId());
  }

  /** Start a fresh conversation; keeps prior threads in history. */
  newChat(): void {
    const thread = this.createThread();
    this._threads.update((list) => [thread, ...list]);
    this._activeThreadId.set(thread.id);
    this._historyOpen.set(false);
    this.persistProject(this._projectId());
  }

  clear(): void {
    const active = this.activeThread();
    if (!active) {
      this.newChat();
      return;
    }

    const hasUser = active.messages.some((m) => m.role === 'user');
    if (hasUser) {
      this.newChat();
      return;
    }

    this.patchActiveThread({
      messages: [
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Chat cleared. Drop in a new goal whenever you’re ready.',
          createdAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    });
  }

  async send(raw: string): Promise<void> {
    const content = raw.trim();
    if (!content || this._sending()) {
      return;
    }

    const projectId = this._projectId();
    const projectCode = this._projectCode();
    if (!projectId || !projectCode) {
      this.appendAssistant(
        'Open a project first — AI decomposition runs in the context of the current project.',
      );
      return;
    }

    this.ensureActiveThread();
    this.appendMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    });
    this.maybeSetTitleFromUser(content);
    this._sending.set(true);

    try {
      this.appendAssistant('Got it — queuing decomposition for this project…');

      const job = await this.projectsService.enqueueAiDecompose(projectId, {
        userInput: content,
      });

      this.replaceLastAssistant(
        `Job queued (${job.status}). Working with the model — this can take a minute…`,
      );

      const finished = await this.pollJob(projectId, job.id);
      if (finished.status === 'Succeeded') {
        const code = finished.rootTaskCode?.trim();
        if (code) {
          const path = APP_PATHS.projectIssue(projectCode, code);
          this.replaceLastAssistant(
            [
              'Done — I created a task tree from your goal.',
              '',
              `Root task: ${code}`,
              '',
              'You can also find the new work on the board and in Issues.',
            ].join('\n'),
            path,
            `Open ${code}`,
          );
        } else {
          this.replaceLastAssistant(
            'Done — the task tree was created. Refresh the board or Issues to see the new tasks.',
          );
        }
        return;
      }

      this.replaceLastAssistant(
        finished.error?.trim()
          ? `Decomposition failed: ${finished.error}`
          : 'Decomposition failed. Please try again with a clearer goal.',
      );
    } catch (err) {
      this.replaceLastAssistant(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this._sending.set(false);
      this.persistProject(projectId);
    }
  }

  private ensureActiveThread(): void {
    if (this.activeThread()) {
      return;
    }
    const thread = this.createThread();
    this._threads.set([thread]);
    this._activeThreadId.set(thread.id);
  }

  private createThread(): AiChatThread {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      title: 'New chat',
      createdAt: now,
      updatedAt: now,
      messages: [this.welcomeMessage()],
    };
  }

  private maybeSetTitleFromUser(content: string): void {
    const active = this.activeThread();
    if (!active || active.title !== 'New chat') {
      return;
    }
    const title = content.length > 48 ? `${content.slice(0, 45).trim()}…` : content;
    this.patchActiveThread({ title });
  }

  private loadProject(projectId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      const thread = this.createThread();
      this._threads.set([thread]);
      this._activeThreadId.set(thread.id);
      return;
    }

    try {
      const raw = localStorage.getItem(threadsKey(projectId));
      const parsed = raw ? (JSON.parse(raw) as AiChatThread[]) : [];
      const threads = Array.isArray(parsed) && parsed.length > 0 ? parsed : [this.createThread()];
      this._threads.set(threads);

      const savedActive = localStorage.getItem(activeKey(projectId));
      const active =
        (savedActive && threads.find((t) => t.id === savedActive)?.id) || threads[0]?.id || null;
      this._activeThreadId.set(active);
      this.persistProject(projectId);
    } catch {
      const thread = this.createThread();
      this._threads.set([thread]);
      this._activeThreadId.set(thread.id);
    }
  }

  private persistProject(projectId: string | null): void {
    if (!projectId || !isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      localStorage.setItem(threadsKey(projectId), JSON.stringify(this._threads()));
      const active = this._activeThreadId();
      if (active) {
        localStorage.setItem(activeKey(projectId), active);
      }
    } catch {
      // ignore quota / private mode
    }
  }

  private patchActiveThread(patch: Partial<AiChatThread>): void {
    const id = this._activeThreadId();
    if (!id) {
      return;
    }
    this._threads.update((list) =>
      list.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: patch.updatedAt ?? new Date().toISOString() } : t)),
    );
    this.persistProject(this._projectId());
  }

  private async pollJob(projectId: string, jobId: string) {
    const started = Date.now();
    while (Date.now() - started < POLL_TIMEOUT_MS) {
      await delay(POLL_INTERVAL_MS);
      const job = await this.projectsService.getAiDecomposeJob(projectId, jobId);
      if (job.status === 'Succeeded' || job.status === 'Failed') {
        return job;
      }
      this.replaceLastAssistant(`Still working… (status: ${job.status})`);
    }

    return {
      id: jobId,
      projectId,
      status: 'Failed',
      userInput: '',
      error: 'Timed out waiting for AI decomposition. Check Issues later or try again.',
      createdAt: new Date().toISOString(),
    };
  }

  private welcomeMessage(): AiChatMessage {
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content:
        'Hi — I’m Skemex AI. Describe a goal or epic, and I’ll decompose it into clear subtasks on this project’s board.',
      createdAt: new Date().toISOString(),
    };
  }

  private appendMessage(message: AiChatMessage): void {
    const active = this.activeThread();
    if (!active) {
      return;
    }
    this.patchActiveThread({
      messages: [...active.messages, message],
      updatedAt: new Date().toISOString(),
    });
  }

  private appendAssistant(content: string): void {
    this.appendMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      createdAt: new Date().toISOString(),
    });
  }

  private replaceLastAssistant(
    content: string,
    linkHref?: string | null,
    linkLabel?: string | null,
  ): void {
    const active = this.activeThread();
    if (!active) {
      return;
    }
    const next = [...active.messages];
    for (let i = next.length - 1; i >= 0; i -= 1) {
      if (next[i].role === 'assistant') {
        next[i] = {
          ...next[i],
          content,
          linkHref: linkHref ?? null,
          linkLabel: linkLabel ?? null,
          createdAt: new Date().toISOString(),
        };
        this.patchActiveThread({ messages: next, updatedAt: new Date().toISOString() });
        return;
      }
    }
    next.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      linkHref: linkHref ?? null,
      linkLabel: linkLabel ?? null,
      createdAt: new Date().toISOString(),
    });
    this.patchActiveThread({ messages: next, updatedAt: new Date().toISOString() });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
