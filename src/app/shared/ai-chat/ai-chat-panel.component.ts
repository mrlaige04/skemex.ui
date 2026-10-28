import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideArrowUp,
  lucideBot,
  lucideCheck,
  lucideEraser,
  lucideFile,
  lucideFileText,
  lucideHistory,
  lucideImage,
  lucideListTodo,
  lucidePaperclip,
  lucidePencil,
  lucidePlus,
  lucideSearch,
  lucideSparkles,
  lucideTrash2,
  lucideUser,
  lucideX,
} from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmSelectImports } from 'spartan/select';
import type { AiChatArtefactRefDto } from '../../models/ai-chat/ai-agent.models';
import { groupAiModelsByProvider, aiAuthorIconSrc } from '../../models/ai-chat/ai-chat.models';
import type {
  ProjectDocumentDto,
  ProjectTaskDto,
  ProjectUserDto,
} from '../../models/projects/projects.models';
import type { PaginatedList } from '../../models/paginated-list';
import { AiChatService } from '../../services/ai-chat/ai-chat.service';
import { ProjectsService } from '../../services/projects/projects.service';
import { ConfirmAlertDialogComponent } from '../confirm-alert-dialog/confirm-alert-dialog.component';
import { AiMarkdownPipe } from '../markdown/ai-markdown.pipe';
import type { AiChatArtefactKind } from './ai-chat-artefact-chip.extension';
import { AiChatMarkdownInputComponent } from './ai-chat-markdown-input.component';

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.png', '.jpg', '.jpeg']);

export type AiChatDraftAttachmentKind = 'file';

export type AiChatMentionKind = AiChatArtefactKind;

export interface AiChatDraftAttachment {
  id: string;
  kind: AiChatDraftAttachmentKind;
  name: string;
  file?: File;
  sizeBytes?: number;
  contentType?: string;
}

export interface AiChatArtefactOption {
  id: string;
  /** Shown in the artefact picker list. */
  label: string;
  /** Shown on the inline chip; defaults to `label`. */
  chipLabel?: string;
}

@Component({
  selector: 'app-ai-chat-panel',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    NgIcon,
    ConfirmAlertDialogComponent,
    AiMarkdownPipe,
    AiChatMarkdownInputComponent,
    ...HlmButtonImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
    ...HlmSelectImports,
  ],
  providers: [
    provideIcons({
      lucideSparkles,
      lucideBot,
      lucideX,
      lucideArrowUp,
      lucideEraser,
      lucideHistory,
      lucidePlus,
      lucideArrowLeft,
      lucidePencil,
      lucideTrash2,
      lucideCheck,
      lucidePaperclip,
      lucideFile,
      lucideFileText,
      lucideImage,
      lucideListTodo,
      lucideUser,
      lucideSearch,
    }),
  ],
  templateUrl: './ai-chat-panel.component.html',
  styleUrl: './ai-chat-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiChatPanelComponent {
  readonly chat = inject(AiChatService);
  private readonly projectsService = inject(ProjectsService);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');
  private readonly markdownInput = viewChild(AiChatMarkdownInputComponent);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private readonly artefactPanel = viewChild<ElementRef<HTMLElement>>('artefactPanel');

  /** Markdown draft from Tiptap shortcuts (includes inline artefact chips). */
  readonly draftMarkdown = signal('');
  /** File attachments only (shown as bottom badges). */
  readonly attachments = signal<AiChatDraftAttachment[]>([]);
  readonly attachmentError = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly editTitle = signal('');

  readonly deleteDialogState = signal<'open' | 'closed'>('closed');
  readonly pendingDeleteId = signal<string | null>(null);
  readonly pendingDeleteTitle = signal('');
  private deleteTargetId: string | null = null;

  /** Inplace @ panel above the composer (Cursor-style). */
  readonly artefactPanelOpen = signal(false);
  readonly mentionMenuPhase = signal<'kinds' | 'picker'>('kinds');
  readonly artefactPickerKind = signal<AiChatMentionKind | null>(null);
  readonly artefactPickerLoading = signal(false);
  readonly artefactPickerError = signal<string | null>(null);
  readonly artefactPickerOptions = signal<AiChatArtefactOption[]>([]);
  readonly artefactPickerFilter = signal('');
  private artefactFilterTimer: ReturnType<typeof setTimeout> | null = null;
  private artefactLoadToken = 0;

  readonly artefactPickerTitle = computed(() => {
    switch (this.artefactPickerKind()) {
      case 'task':
        return 'Select task';
      case 'user':
        return 'Select user';
      case 'document':
        return 'Select document';
      default:
        return 'Select item';
    }
  });

  readonly modelsByProvider = computed(() => groupAiModelsByProvider(this.chat.models()));
  readonly authorIconSrc = aiAuthorIconSrc;
  readonly fileAttachments = computed(() => this.attachments());
  readonly canSend = computed(
    () => this.draftMarkdown().trim().length > 0 || this.attachments().length > 0,
  );

  hasLiveProgress(): boolean {
    if (!this.chat.sending()) {
      return false;
    }
    const items = this.chat.displayItems();
    return items.length > 0 && items[items.length - 1]?.kind === 'progress';
  }

  stepEnterDelay(index: number): number {
    return Math.min(index * 40, 240);
  }

  attachmentIcon(attachment: AiChatDraftAttachment): string {
    const name = attachment.name.toLowerCase();
    if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
      return 'lucideImage';
    }
    if (name.endsWith('.pdf') || name.endsWith('.docx')) {
      return 'lucideFileText';
    }
    return 'lucideFile';
  }

  modelById(value: unknown) {
    if (value == null || value === '') {
      return null;
    }
    const id = String(value);
    return this.chat.models().find((m) => m.id === id) ?? null;
  }

  readonly modelLabel = (value: unknown): string => {
    if (value == null || value === '') {
      return 'Select model';
    }
    return this.modelById(value)?.displayName ?? String(value);
  };

  onModelChange(value: unknown): void {
    if (value == null || value === '') {
      return;
    }
    void this.chat.setSelectedModel(String(value));
  }

  constructor() {
    afterNextRender(() => this.scrollToBottom());
    effect(() => {
      this.chat.displayItems();
      this.chat.sending();
      this.chat.historyOpen();
      this.scrollToBottom();
    });
    effect(() => {
      if (!this.chat.historyOpen()) {
        this.cancelEdit();
      }
    });
    effect(() => {
      if (this.editingId() && this.titleInput()) {
        queueMicrotask(() => this.titleInput()?.nativeElement.focus());
      }
    });
  }

  onDraftChange(markdown: string): void {
    this.draftMarkdown.set(markdown);
  }

  openFilePicker(): void {
    if (this.chat.sending()) {
      return;
    }
    this.attachmentError.set(null);
    this.fileInput()?.nativeElement.click();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.artefactPanelOpen()) {
      this.closeArtefactPanel();
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.artefactPanelOpen()) {
      return;
    }

    const panel = this.artefactPanel()?.nativeElement;
    const target = event.target;
    if (!(target instanceof Node) || !panel || panel.contains(target)) {
      return;
    }

    this.closeArtefactPanel();
  }

  onMentionShortcut(): void {
    if (this.chat.sending()) {
      return;
    }
    this.attachmentError.set(null);
    this.resetArtefactPicker();
    this.artefactPanelOpen.set(true);
    this.mentionMenuPhase.set('kinds');
  }

  closeArtefactPanel(options?: { restoreFocus?: boolean }): void {
    this.markdownInput()?.clearMentionTrigger();
    this.artefactPanelOpen.set(false);
    this.resetArtefactPicker();
    if (options?.restoreFocus === false) {
      return;
    }
    queueMicrotask(() => this.markdownInput()?.focus('keep'));
  }

  onMentionDismiss(): void {
    if (!this.artefactPanelOpen()) {
      return;
    }
    this.closeArtefactPanel({ restoreFocus: false });
  }

  backToArtefactKinds(): void {
    this.artefactPickerKind.set(null);
    this.artefactPickerOptions.set([]);
    this.artefactPickerFilter.set('');
    this.artefactPickerError.set(null);
    this.artefactPickerLoading.set(false);
    this.mentionMenuPhase.set('kinds');
  }

  onMentionMenu(kind: AiChatMentionKind): void {
    const projectId = this.chat.projectId();
    if (!projectId) {
      this.attachmentError.set('Open a project first to link tasks, users, or documents.');
      return;
    }

    if (this.artefactFilterTimer) {
      clearTimeout(this.artefactFilterTimer);
      this.artefactFilterTimer = null;
    }

    this.artefactPickerKind.set(kind);
    this.artefactPickerFilter.set('');
    this.artefactPickerError.set(null);
    this.artefactPickerOptions.set([]);
    this.artefactPickerLoading.set(true);
    this.mentionMenuPhase.set('picker');
    void this.reloadArtefactOptions();
  }

  onArtefactFilterInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.artefactPickerFilter.set(value);
    if (this.artefactFilterTimer) {
      clearTimeout(this.artefactFilterTimer);
    }
    this.artefactFilterTimer = setTimeout(() => {
      this.artefactFilterTimer = null;
      void this.reloadArtefactOptions();
    }, 250);
  }

  selectArtefactOption(option: AiChatArtefactOption): void {
    const kind = this.artefactPickerKind();
    if (!kind) {
      return;
    }

    const number = this.markdownInput()?.nextArtefactNumber() ?? 1;
    this.markdownInput()?.insertArtefactChip({
      kind,
      id: option.id,
      label: option.chipLabel ?? option.label,
      number,
    });
    this.closeArtefactPanel({ restoreFocus: false });
  }

  private async reloadArtefactOptions(): Promise<void> {
    const kind = this.artefactPickerKind();
    const projectId = this.chat.projectId();
    if (!kind || !projectId) {
      this.artefactPickerLoading.set(false);
      return;
    }

    const token = ++this.artefactLoadToken;
    this.artefactPickerLoading.set(true);
    this.artefactPickerError.set(null);

    try {
      const search = this.artefactPickerFilter().trim() || undefined;
      const options =
        kind === 'task'
          ? await this.loadTaskOptions(projectId, search)
          : kind === 'user'
            ? await this.loadUserOptions(projectId, search)
            : await this.loadDocumentOptions(projectId, search);
      if (token !== this.artefactLoadToken) {
        return;
      }
      this.artefactPickerOptions.set(options);
      this.artefactPickerError.set(
        options.length === 0
          ? search
            ? 'No matches.'
            : 'No items found in this project.'
          : null,
      );
    } catch {
      if (token !== this.artefactLoadToken) {
        return;
      }
      this.artefactPickerOptions.set([]);
      this.artefactPickerError.set('Could not load items. Please try again.');
    } finally {
      if (token === this.artefactLoadToken) {
        this.artefactPickerLoading.set(false);
      }
    }
  }

  resetArtefactPicker(): void {
    if (this.artefactFilterTimer) {
      clearTimeout(this.artefactFilterTimer);
      this.artefactFilterTimer = null;
    }
    this.artefactLoadToken += 1;
    this.mentionMenuPhase.set('kinds');
    this.artefactPickerKind.set(null);
    this.artefactPickerOptions.set([]);
    this.artefactPickerFilter.set('');
    this.artefactPickerError.set(null);
    this.artefactPickerLoading.set(false);
  }

  private async loadTaskOptions(
    projectId: string,
    search?: string,
  ): Promise<AiChatArtefactOption[]> {
    const tasks = await this.fetchAllPages((page) =>
      this.projectsService.listTasks(projectId, {
        page,
        pageSize: 100,
        sort: 'codeAsc',
        search,
      }),
    );
    return tasks.map((task: ProjectTaskDto) => {
      const code = task.code.trim();
      const title = task.title.trim();
      return {
        id: task.id,
        label: title ? `${code} ${title}` : code,
        chipLabel: code,
      };
    });
  }

  private async loadUserOptions(
    projectId: string,
    search?: string,
  ): Promise<AiChatArtefactOption[]> {
    const users = await this.fetchAllPages((page) =>
      this.projectsService.listUsers(projectId, search, page, 100),
    );
    return users.map((user: ProjectUserDto) => ({
      id: user.id,
      label: `${user.firstName} ${user.lastName}`.trim(),
    }));
  }

  private async loadDocumentOptions(
    projectId: string,
    search?: string,
  ): Promise<AiChatArtefactOption[]> {
    const documents = await this.fetchAllPages((page) =>
      this.projectsService.listDocuments(projectId, search, page, 100),
    );
    return documents.map((doc: ProjectDocumentDto) => ({
      id: doc.id,
      label: doc.fileName,
    }));
  }

  private async fetchAllPages<T>(
    fetchPage: (page: number) => Promise<PaginatedList<T>>,
  ): Promise<T[]> {
    const all: T[] = [];
    let page = 1;
    for (;;) {
      const result = await fetchPage(page);
      all.push(...result.items);
      if (result.items.length === 0 || all.length >= result.totalItems) {
        break;
      }
      page += 1;
      if (page > 50) {
        break;
      }
    }
    return all;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    input.value = '';
    if (selected.length === 0) {
      return;
    }

    this.attachmentError.set(null);
    const next = [...this.attachments()];
    for (const file of selected) {
      if (next.length >= MAX_ATTACHMENTS) {
        this.attachmentError.set(`You can attach at most ${MAX_ATTACHMENTS} files.`);
        break;
      }

      const extension = this.fileExtension(file.name);
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        this.attachmentError.set('Only PDF, DOCX, PNG, and JPG files are allowed.');
        continue;
      }
      if (file.size <= 0 || file.size > MAX_ATTACHMENT_BYTES) {
        this.attachmentError.set('Each attachment must be 25 MB or smaller.');
        continue;
      }
      if (next.some((item) => item.kind === 'file' && item.name === file.name && item.sizeBytes === file.size)) {
        continue;
      }

      next.push({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'file',
        name: file.name,
        file,
        sizeBytes: file.size,
        contentType: file.type,
      });
    }

    this.attachments.set(next);
  }

  removeAttachment(id: string): void {
    this.attachments.update((list) => list.filter((item) => item.id !== id));
    this.attachmentError.set(null);
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    // Read live from the editor so artefact chips are never stale `[artefactChip]` stubs.
    const markdown = (this.markdownInput()?.getMarkdown() ?? this.draftMarkdown())
      .trim()
      .slice(0, 4000);
    const files = this.attachments()
      .filter((item) => item.kind === 'file' && item.file)
      .map((item) => item.file!);
    const artefacts: AiChatArtefactRefDto[] = (this.markdownInput()?.listArtefacts() ?? []).map(
      (chip) => ({
        number: chip.number,
        type: chip.kind,
        entityId: chip.id,
      }),
    );
    if ((!markdown && files.length === 0) || this.chat.sending()) {
      return;
    }
    this.draftMarkdown.set('');
    this.attachments.set([]);
    this.attachmentError.set(null);
    this.markdownInput()?.setMarkdown('');
    void this.chat.send(markdown, files, artefacts);
  }

  usePrompt(prompt: string): void {
    this.draftMarkdown.set(prompt);
    this.markdownInput()?.setMarkdown(prompt);
    queueMicrotask(() => this.markdownInput()?.focus());
  }

  startEdit(threadId: string, title: string): void {
    this.editingId.set(threadId);
    this.editTitle.set(title);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editTitle.set('');
  }

  saveTitle(threadId: string, event?: Event): void {
    event?.preventDefault();
    void this.chat.renameThread(threadId, this.editTitle()).then(() => this.cancelEdit());
  }

  requestDelete(threadId: string, title: string): void {
    this.deleteTargetId = threadId;
    this.pendingDeleteId.set(threadId);
    this.pendingDeleteTitle.set(title.trim() || 'Untitled chat');
    this.deleteDialogState.set('open');
  }

  performDelete(): void {
    const threadId = this.deleteTargetId ?? this.pendingDeleteId();
    this.deleteTargetId = null;
    this.pendingDeleteId.set(null);
    this.pendingDeleteTitle.set('');
    if (!threadId) {
      return;
    }
    if (this.editingId() === threadId) {
      this.cancelEdit();
    }
    void this.chat.deleteThread(threadId);
  }

  private fileExtension(fileName: string): string {
    const index = fileName.lastIndexOf('.');
    return index >= 0 ? fileName.slice(index).toLowerCase() : '';
  }

  private scrollToBottom(): void {
    queueMicrotask(() => {
      const el = this.scroller()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }
}

