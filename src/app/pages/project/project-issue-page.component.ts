import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideLoaderCircle,
  lucidePaperclip,
  lucidePencil,
  lucidePlus,
  lucideTrash2,
  lucideUpload,
} from '@ng-icons/lucide';
import { map } from 'rxjs/operators';
import { HlmButtonImports } from 'spartan/button';
import { HlmDialogImports } from 'spartan/dialog';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputImports } from 'spartan/input';
import { HlmSelectImports } from 'spartan/select';
import { HlmTabsImports } from 'spartan/tabs';
import { problemDetailMessage } from '../../http/problem-details';
import type {
  ProjectColumnDto,
  ProjectTaskAttachmentDto,
  ProjectTaskDto,
  ProjectTaskWorkLogDto,
  ProjectUserDto,
  UpdateProjectTaskRequest,
} from '../../models/projects/projects.models';
import { projectSectionPath } from '../../routing/app-paths';
import { AuthService } from '../../services/auth/auth.service';
import { ProjectsService } from '../../services/projects/projects.service';
import { ConfirmAlertDialogComponent } from '../../shared/confirm-alert-dialog/confirm-alert-dialog.component';
import { RichTextEditorComponent } from '../../shared/rich-text/rich-text-editor.component';
import { normalizeRichHtml } from '../../shared/rich-text/rich-text.util';
import { TaskTypeBadgeComponent } from '../../shared/task-type-badge/task-type-badge.component';
import { TaskTagsInputComponent } from '../../shared/task-tags-input/task-tags-input.component';
import { TaskTimeProgressComponent } from '../../shared/time-tracking/task-time-progress.component';
import {
  formatDurationMinutes,
  combineDateAndTimeToIso,
  defaultWorkLogParts,
  minutesBetweenDateAndTimes,
  parseDurationToMinutes,
  splitIsoToDateAndTime,
  toDateInputValue,
} from '../../shared/time-tracking/time-format.util';

function formatDateTime(iso?: string | null): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatWorkLogRangeLabel(startedAt?: string | null, endedAt?: string | null): string {
  if (!startedAt || !endedAt) {
    return '—';
  }
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return '—';
  }
  const dateLabel = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(start);
  const timeFmt = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
  return `${dateLabel} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
}

function personLabel(user: ProjectUserDto | ProjectTaskDto['reporter']): string {
  const name = `${user.firstName} ${user.lastName}`.trim();
  return name || user.email;
}

function formatAttachmentFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '—';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

@Component({
  selector: 'app-project-issue-page',
  imports: [
    RouterLink,
    NgIcon,
    TaskTimeProgressComponent,
    TaskTypeBadgeComponent,
    TaskTagsInputComponent,
    ConfirmAlertDialogComponent,
    RichTextEditorComponent,
    ...HlmButtonImports,
    ...HlmDialogImports,
    ...HlmIconImports,
    ...HlmInputImports,
    ...HlmSelectImports,
    ...HlmTabsImports,
  ],
  providers: [
    provideIcons({
      lucideLoaderCircle,
      lucidePaperclip,
      lucidePencil,
      lucidePlus,
      lucideTrash2,
      lucideUpload,
    }),
  ],
  templateUrl: './project-issue-page.component.html',
  styleUrl: './project-issue-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0 overflow-y-auto' },
})
export class ProjectIssuePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly activeTab = signal('acceptance');

  onTabActivated(tab: string): void {
    this.activeTab.set(tab);
  }

  readonly editingTitle = signal(false);
  readonly titleDraft = signal('');
  readonly descriptionDraft = signal('');
  readonly descriptionDirty = signal(false);

  readonly originalEstimateDraft = signal('');
  readonly storyPointsDraft = signal('');
  readonly estimatesDirty = signal(false);
  readonly estimateDialogState = signal<'open' | 'closed'>('closed');
  readonly estimateError = signal<string | null>(null);

  readonly logDialogState = signal<'open' | 'closed'>('closed');
  readonly editingWorkLogId = signal<string | null>(null);
  readonly logDateDraft = signal(toDateInputValue());
  readonly logStartTimeDraft = signal('09:00');
  readonly logEndTimeDraft = signal('10:00');
  readonly logCommentDraft = signal('');
  readonly logError = signal<string | null>(null);

  /** Calendar day captured when the issue page was opened (Jira-like default date). */
  private pageOpenedDate = new Date();

  readonly deleteDialogState = signal<'open' | 'closed'>('closed');
  readonly pendingDeleteWorkLogId = signal<string | null>(null);

  readonly task = signal<ProjectTaskDto | null>(null);
  readonly columns = signal<ProjectColumnDto[]>([]);
  readonly members = signal<ProjectUserDto[]>([]);
  readonly attachments = signal<ProjectTaskAttachmentDto[]>([]);
  readonly attachmentsLoading = signal(false);
  readonly attachmentUploading = signal(false);
  readonly attachmentError = signal<string | null>(null);

  readonly projectCode = signal('');

  readonly createdLabel = computed(() => formatDateTime(this.task()?.createdAt));
  readonly updatedLabel = computed(() => formatDateTime(this.task()?.updatedAt));
  readonly isSubtask = computed(() => !!this.task()?.parentId);
  readonly taskTypes = ['Feature', 'Task', 'Bug'] as const;
  readonly availableTaskTypes = computed(() =>
    this.isSubtask() ? (['Task', 'Bug'] as const) : this.taskTypes,
  );
  readonly tags = computed(() =>
    (this.task()?.tags ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0),
  );
  readonly formatAttachmentSize = formatAttachmentFileSize;
  readonly subtasks = computed(() => this.task()?.subtasks ?? []);
  readonly workLogs = computed(() => this.task()?.workLogs ?? []);
  readonly acceptanceCriteria = computed(() =>
    (this.task()?.acceptanceCriteria ?? []).filter((item) => item.trim().length > 0),
  );
  readonly risks = computed(() =>
    (this.task()?.risks ?? []).filter((item) => item.trim().length > 0),
  );
  readonly positiveTestCases = computed(() =>
    (this.task()?.testCases ?? []).filter(
      (item) => item.type?.trim().toLowerCase() !== 'negative',
    ),
  );
  readonly negativeTestCases = computed(() =>
    (this.task()?.testCases ?? []).filter(
      (item) => item.type?.trim().toLowerCase() === 'negative',
    ),
  );
  readonly hasQualityArtifacts = computed(
    () =>
      this.acceptanceCriteria().length > 0
      || this.risks().length > 0
      || this.positiveTestCases().length > 0
      || this.negativeTestCases().length > 0,
  );

  readonly canAssignToMe = computed(() => {
    const meId = this.currentMemberId();
    const assigneeId = this.task()?.assignee?.id;
    return !!meId && meId !== assigneeId;
  });

  readonly formatDuration = formatDurationMinutes;
  readonly formatDateTime = formatDateTime;
  readonly formatWorkLogRange = (log: ProjectTaskWorkLogDto) =>
    formatWorkLogRangeLabel(log.startedAt, log.endedAt);

  readonly logDurationPreview = computed(() => {
    const minutes = minutesBetweenDateAndTimes(
      this.logDateDraft(),
      this.logStartTimeDraft(),
      this.logEndTimeDraft(),
    );
    return minutes == null ? null : formatDurationMinutes(minutes);
  });

  private projectId: string | null = null;

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('issueCode')?.trim() ?? ''),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((issueCode) => {
        void this.loadIssue(issueCode);
      });

    effect(() => {
      const current = this.task();
      if (!current || this.editingTitle() || this.descriptionDirty() || this.estimatesDirty()) {
        return;
      }
      this.titleDraft.set(current.title);
      this.descriptionDraft.set(current.description ?? '');
      this.syncEstimateDrafts(current);
    });
  }

  columnLabel = (columnId: string | null): string => {
    if (!columnId) {
      return 'Status';
    }
    return this.columns().find((column) => column.id === columnId)?.title ?? '';
  };

  typeLabel = (type: string | null): string => type?.trim() || 'Task';

  assigneeLabel = (assigneeId: string | null): string => {
    if (!assigneeId) {
      return 'Unassigned';
    }
    const member = this.members().find((entry) => entry.id === assigneeId);
    return member ? personLabel(member) : '';
  };

  reporterLabel = (reporterId: string | null): string => {
    if (!reporterId) {
      return 'Reporter';
    }
    const member = this.members().find((entry) => entry.id === reporterId);
    if (member) {
      return personLabel(member);
    }
    const reporter = this.task()?.reporter;
    return reporter && reporter.id === reporterId ? personLabel(reporter) : '';
  };

  memberLabel(member: ProjectUserDto): string {
    return personLabel(member);
  }

  workLogAuthor(log: ProjectTaskWorkLogDto): string {
    return personLabel(log.user);
  }

  startEditTitle(): void {
    const current = this.task();
    if (!current || this.saving()) {
      return;
    }
    this.titleDraft.set(current.title);
    this.editingTitle.set(true);
  }

  cancelEditTitle(): void {
    this.editingTitle.set(false);
    this.titleDraft.set(this.task()?.title ?? '');
  }

  onTitleInput(event: Event): void {
    this.titleDraft.set((event.target as HTMLInputElement).value);
  }

  onDescriptionChange(html: string): void {
    this.descriptionDraft.set(html);
    this.descriptionDirty.set(true);
  }

  onOriginalEstimateInput(event: Event): void {
    this.originalEstimateDraft.set((event.target as HTMLInputElement).value);
    this.estimatesDirty.set(true);
    this.estimateError.set(null);
  }

  onStoryPointsInput(event: Event): void {
    this.storyPointsDraft.set((event.target as HTMLInputElement).value);
    this.estimatesDirty.set(true);
    this.estimateError.set(null);
  }

  openEstimateDialog(): void {
    const current = this.task();
    if (current) {
      this.syncEstimateDrafts(current);
    }
    this.estimatesDirty.set(false);
    this.estimateError.set(null);
    this.estimateDialogState.set('open');
  }

  onEstimateDialogStateChanged(state: 'open' | 'closed'): void {
    this.estimateDialogState.set(state);
    if (state === 'closed') {
      const current = this.task();
      if (current) {
        this.syncEstimateDrafts(current);
      }
      this.estimatesDirty.set(false);
      this.estimateError.set(null);
    }
  }

  async saveTitle(): Promise<void> {
    const current = this.task();
    const next = this.titleDraft().trim();
    if (!current || !next || next === current.title) {
      this.editingTitle.set(false);
      this.titleDraft.set(current?.title ?? '');
      return;
    }

    await this.patchTask({ title: next });
    this.editingTitle.set(false);
  }

  async saveDescription(): Promise<void> {
    const current = this.task();
    if (!current || !this.descriptionDirty()) {
      return;
    }

    const next = normalizeRichHtml(this.descriptionDraft());
    const previous = normalizeRichHtml(current.description);
    if (next === previous) {
      this.descriptionDirty.set(false);
      return;
    }

    if (!next) {
      await this.patchTask({ clearDescription: true });
    } else {
      await this.patchTask({ description: next });
    }
    this.descriptionDirty.set(false);
  }

  async saveEstimates(): Promise<void> {
    const current = this.task();
    if (!current || this.saving()) {
      return;
    }

    const body: UpdateProjectTaskRequest = {};
    const originalRaw = this.originalEstimateDraft().trim();
    if (!originalRaw) {
      if (current.originalEstimateMinutes != null) {
        body.clearOriginalEstimate = true;
      }
    } else {
      const minutes = parseDurationToMinutes(originalRaw);
      if (minutes == null) {
        this.estimateError.set('Estimate must look like 2h 30m, 1.5h, or 90m.');
        return;
      }
      if (minutes !== current.originalEstimateMinutes) {
        body.originalEstimateMinutes = minutes;
      }
    }

    const storyRaw = this.storyPointsDraft().trim();
    if (!storyRaw) {
      if (current.storyPoints != null) {
        body.clearStoryPoints = true;
      }
    } else {
      const points = Number(storyRaw);
      if (!Number.isInteger(points) || points < 0) {
        this.estimateError.set('Story points must be a non-negative whole number.');
        return;
      }
      if (points !== current.storyPoints) {
        body.storyPoints = points;
      }
    }

    if (
      !body.clearOriginalEstimate
      && body.originalEstimateMinutes == null
      && !body.clearStoryPoints
      && body.storyPoints == null
    ) {
      this.estimatesDirty.set(false);
      this.estimateDialogState.set('closed');
      return;
    }

    this.estimateError.set(null);
    await this.patchTask(body);
    if (!this.saveError()) {
      this.estimatesDirty.set(false);
      this.estimateDialogState.set('closed');
    }
  }

  async onStatusChange(columnId: string | null): Promise<void> {
    const current = this.task();
    if (!current || !columnId || columnId === current.projectColumnId) {
      return;
    }
    await this.patchTask({ columnId });
  }

  async onTypeChange(type: string | null): Promise<void> {
    const current = this.task();
    const next = type?.trim();
    if (!current || !next || next === (current.type ?? 'Task')) {
      return;
    }
    await this.patchTask({ type: next });
  }

  async onTagsChange(nextTags: string[]): Promise<void> {
    const current = this.task();
    if (!current || this.saving()) {
      return;
    }

    const normalized = nextTags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
    const existing = this.tags();
    if (
      normalized.length === existing.length
      && normalized.every((tag, index) => tag === existing[index])
    ) {
      return;
    }

    if (normalized.some((tag) => tag.length > 40)) {
      this.saveError.set('Each tag cannot exceed 40 characters.');
      return;
    }

    if (normalized.length > 20) {
      this.saveError.set('A task cannot have more than 20 tags.');
      return;
    }

    await this.patchTask({ tags: normalized });
  }

  async onAssigneeChange(assigneeId: string | null): Promise<void> {
    const current = this.task();
    if (!current) {
      return;
    }
    const previous = current.assignee?.id ?? null;
    if (assigneeId === previous) {
      return;
    }
    if (!assigneeId) {
      await this.patchTask({ clearAssignee: true });
    } else {
      await this.patchTask({ assigneeId });
    }
  }

  async onReporterChange(reporterId: string | null): Promise<void> {
    const current = this.task();
    if (!current || !reporterId || reporterId === current.reporter.id) {
      return;
    }
    await this.patchTask({ reporterId });
  }

  async assignToMe(): Promise<void> {
    const meId = this.currentMemberId();
    if (!meId) {
      return;
    }
    await this.onAssigneeChange(meId);
  }

  issueLink(issueCode: string): string[] {
    return projectSectionPath(this.projectCode(), `issues/${issueCode}`);
  }

  openLogDialog(log?: ProjectTaskWorkLogDto): void {
    this.logError.set(null);
    if (log) {
      this.editingWorkLogId.set(log.id);
      const start = splitIsoToDateAndTime(log.startedAt);
      const end = splitIsoToDateAndTime(log.endedAt);
      this.logDateDraft.set(start?.date ?? toDateInputValue(this.pageOpenedDate));
      this.logStartTimeDraft.set(start?.time ?? '09:00');
      this.logEndTimeDraft.set(end?.time ?? '10:00');
      this.logCommentDraft.set(log.comment ?? '');
    } else {
      this.editingWorkLogId.set(null);
      const parts = defaultWorkLogParts(this.pageOpenedDate);
      this.logDateDraft.set(parts.date);
      this.logStartTimeDraft.set(parts.startTime);
      this.logEndTimeDraft.set(parts.endTime);
      this.logCommentDraft.set('');
    }
    this.logDialogState.set('open');
  }

  onLogDialogStateChanged(state: 'open' | 'closed'): void {
    this.logDialogState.set(state);
  }

  onLogDateInput(event: Event): void {
    this.logDateDraft.set((event.target as HTMLInputElement).value);
  }

  onLogStartTimeInput(event: Event): void {
    this.logStartTimeDraft.set((event.target as HTMLInputElement).value);
  }

  onLogEndTimeInput(event: Event): void {
    this.logEndTimeDraft.set((event.target as HTMLInputElement).value);
  }

  onLogCommentInput(event: Event): void {
    this.logCommentDraft.set((event.target as HTMLTextAreaElement).value);
  }

  async submitWorkLog(): Promise<void> {
    const current = this.task();
    if (!current || !this.projectId || this.saving()) {
      return;
    }

    const startedAt = combineDateAndTimeToIso(this.logDateDraft(), this.logStartTimeDraft());
    const endedAt = combineDateAndTimeToIso(this.logDateDraft(), this.logEndTimeDraft());
    if (!startedAt || !endedAt) {
      this.logError.set('Enter a valid date, start time, and end time.');
      return;
    }
    if (new Date(endedAt).getTime() <= new Date(startedAt).getTime()) {
      this.logError.set('End time must be after start time.');
      return;
    }

    this.saving.set(true);
    this.logError.set(null);
    this.saveError.set(null);
    try {
      const editId = this.editingWorkLogId();
      if (editId) {
        await this.projectsService.updateTaskWorkLog(this.projectId, current.id, editId, {
          startedAt,
          endedAt,
          comment: this.logCommentDraft().trim() || null,
          clearComment: !this.logCommentDraft().trim(),
        });
      } else {
        await this.projectsService.createTaskWorkLog(this.projectId, current.id, {
          startedAt,
          endedAt,
          comment: this.logCommentDraft().trim() || null,
        });
      }
      this.logDialogState.set('closed');
      await this.reloadTask();
    } catch (err) {
      this.logError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.saving.set(false);
    }
  }

  confirmDeleteWorkLog(workLogId: string): void {
    this.pendingDeleteWorkLogId.set(workLogId);
    this.deleteDialogState.set('open');
  }

  async deletePendingWorkLog(): Promise<void> {
    const current = this.task();
    const workLogId = this.pendingDeleteWorkLogId();
    if (!current || !this.projectId || !workLogId || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    try {
      await this.projectsService.deleteTaskWorkLog(this.projectId, current.id, workLogId);
      this.deleteDialogState.set('closed');
      this.pendingDeleteWorkLogId.set(null);
      await this.reloadTask();
    } catch (err) {
      this.saveError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.saving.set(false);
    }
  }

  private syncEstimateDrafts(task: ProjectTaskDto): void {
    this.originalEstimateDraft.set(
      task.originalEstimateMinutes == null
        ? ''
        : formatDurationMinutes(task.originalEstimateMinutes),
    );
    this.storyPointsDraft.set(task.storyPoints == null ? '' : String(task.storyPoints));
  }

  private currentMemberId(): string | null {
    const email = this.auth.workspaceContext()?.userEmail?.trim().toLowerCase();
    if (!email) {
      return null;
    }
    return this.members().find((member) => member.email.trim().toLowerCase() === email)?.id ?? null;
  }

  private async patchTask(body: UpdateProjectTaskRequest): Promise<void> {
    const current = this.task();
    if (!current || !this.projectId || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    try {
      const updated = await this.projectsService.updateTask(this.projectId, current.id, body);
      this.task.set({
        ...updated,
        workLogs: updated.workLogs?.length ? updated.workLogs : current.workLogs,
      });
      this.syncEstimateDrafts(updated);
    } catch (err) {
      this.saveError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.saving.set(false);
    }
  }

  private async reloadTask(): Promise<void> {
    const current = this.task();
    if (!current || !this.projectId) {
      return;
    }
    const refreshed = await this.projectsService.getTaskByCode(this.projectId, current.code);
    this.task.set(refreshed);
    this.syncEstimateDrafts(refreshed);
  }

  async onAttachmentFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) {
      return;
    }

    const current = this.task();
    if (!current || !this.projectId || this.attachmentUploading()) {
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      this.attachmentError.set('File size cannot exceed 25 MB.');
      return;
    }

    this.attachmentUploading.set(true);
    this.attachmentError.set(null);
    try {
      const created = await this.projectsService.uploadTaskAttachment(
        this.projectId,
        current.id,
        file,
      );
      this.attachments.update((items) => [created, ...items]);
    } catch (err) {
      this.attachmentError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.attachmentUploading.set(false);
    }
  }

  async deleteAttachment(attachment: ProjectTaskAttachmentDto): Promise<void> {
    const current = this.task();
    if (!current || !this.projectId || this.attachmentUploading()) {
      return;
    }

    this.attachmentUploading.set(true);
    this.attachmentError.set(null);
    try {
      await this.projectsService.deleteTaskAttachment(
        this.projectId,
        current.id,
        attachment.id,
      );
      this.attachments.update((items) => items.filter((item) => item.id !== attachment.id));
    } catch (err) {
      this.attachmentError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.attachmentUploading.set(false);
    }
  }

  private async loadAttachments(projectId: string, taskId: string): Promise<void> {
    this.attachmentsLoading.set(true);
    this.attachmentError.set(null);
    try {
      const items = await this.projectsService.listTaskAttachments(projectId, taskId);
      this.attachments.set(items);
    } catch (err) {
      this.attachments.set([]);
      this.attachmentError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.attachmentsLoading.set(false);
    }
  }

  private async loadIssue(issueCode: string): Promise<void> {
    const projectCode =
      this.route.parent?.snapshot.paramMap.get('projectCode')?.trim().toUpperCase() ?? '';
    const normalizedIssue = issueCode.trim().toUpperCase();

    this.projectCode.set(projectCode);
    this.editingTitle.set(false);
    this.descriptionDirty.set(false);
    this.estimatesDirty.set(false);
    this.saveError.set(null);
    this.estimateDialogState.set('closed');
    this.estimateError.set(null);
    this.logDialogState.set('closed');
    this.activeTab.set('acceptance');
    this.attachments.set([]);
    this.attachmentError.set(null);
    this.pageOpenedDate = new Date();
    this.logDateDraft.set(toDateInputValue(this.pageOpenedDate));

    if (!projectCode || !normalizedIssue) {
      this.loading.set(false);
      this.loadError.set('Issue was not found.');
      this.task.set(null);
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);

    try {
      const project = await this.projectsService.getByCode(projectCode);
      if (!project) {
        this.loadError.set('Project was not found.');
        this.task.set(null);
        this.projectId = null;
        return;
      }

      this.projectId = project.id;
      const [task, columns, usersPage] = await Promise.all([
        this.projectsService.getTaskByCode(project.id, normalizedIssue),
        this.projectsService.listColumns(project.id),
        this.projectsService.listUsers(project.id, undefined, 1, 100),
      ]);

      this.task.set(task);
      this.columns.set(
        [...columns].sort(
          (left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title),
        ),
      );
      this.members.set(usersPage.items);
      this.titleDraft.set(task.title);
      this.descriptionDraft.set(task.description ?? '');
      this.syncEstimateDrafts(task);
      await this.loadAttachments(project.id, task.id);
    } catch (err) {
      this.loadError.set(problemDetailMessage(err as HttpErrorResponse));
      this.task.set(null);
      this.attachments.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
