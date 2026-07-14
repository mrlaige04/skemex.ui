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
} from '@ng-icons/lucide';
import { map } from 'rxjs/operators';
import { HlmAccordionImports } from 'spartan/accordion';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputImports } from 'spartan/input';
import { HlmSelectImports } from 'spartan/select';
import { problemDetailMessage } from '../../http/problem-details';
import type {
  ProjectColumnDto,
  ProjectTaskDto,
  ProjectUserDto,
  UpdateProjectTaskRequest,
} from '../../models/projects/projects.models';
import { projectSectionPath } from '../../routing/app-paths';
import { AuthService } from '../../services/auth/auth.service';
import { ProjectsService } from '../../services/projects/projects.service';
import { IssuePersonChipComponent } from './issue-person-chip.component';

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

function personLabel(user: ProjectUserDto): string {
  const name = `${user.firstName} ${user.lastName}`.trim();
  return name || user.email;
}

@Component({
  selector: 'app-project-issue-page',
  imports: [
    RouterLink,
    NgIcon,
    IssuePersonChipComponent,
    ...HlmAccordionImports,
    ...HlmButtonImports,
    ...HlmIconImports,
    ...HlmInputImports,
    ...HlmSelectImports,
  ],
  providers: [
    provideIcons({
      lucideLoaderCircle,
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

  readonly editingTitle = signal(false);
  readonly titleDraft = signal('');
  readonly descriptionDraft = signal('');
  readonly descriptionDirty = signal(false);

  readonly task = signal<ProjectTaskDto | null>(null);
  readonly columns = signal<ProjectColumnDto[]>([]);
  readonly members = signal<ProjectUserDto[]>([]);

  readonly projectCode = signal('');

  readonly createdLabel = computed(() => formatDateTime(this.task()?.createdAt));
  readonly updatedLabel = computed(() => formatDateTime(this.task()?.updatedAt));
  readonly isSubtask = computed(() => !!this.task()?.parentId);
  readonly subtasks = computed(() => this.task()?.subtasks ?? []);

  readonly canAssignToMe = computed(() => {
    const meId = this.currentMemberId();
    const assigneeId = this.task()?.assignee?.id;
    return !!meId && meId !== assigneeId;
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
      if (!current || this.editingTitle() || this.descriptionDirty()) {
        return;
      }
      this.titleDraft.set(current.title);
      this.descriptionDraft.set(current.description ?? '');
    });
  }

  columnLabel = (columnId: string | null): string => {
    if (!columnId) {
      return 'Status';
    }
    return this.columns().find((column) => column.id === columnId)?.title ?? '';
  };

  assigneeLabel = (assigneeId: string | null): string => {
    if (!assigneeId) {
      return 'Unassigned';
    }
    const member = this.members().find((entry) => entry.id === assigneeId);
    return member ? personLabel(member) : '';
  };

  memberLabel(member: ProjectUserDto): string {
    return personLabel(member);
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

  onDescriptionInput(event: Event): void {
    this.descriptionDraft.set((event.target as HTMLTextAreaElement).value);
    this.descriptionDirty.set(true);
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

    const next = this.descriptionDraft().trim();
    const previous = (current.description ?? '').trim();
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

  async onStatusChange(columnId: string | null): Promise<void> {
    const current = this.task();
    if (!current || !columnId || columnId === current.projectColumnId || this.isSubtask()) {
      return;
    }
    await this.patchTask({ columnId });
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
      this.task.set(updated);
    } catch (err) {
      this.saveError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.saving.set(false);
    }
  }

  private async loadIssue(issueCode: string): Promise<void> {
    const projectCode =
      this.route.parent?.snapshot.paramMap.get('projectCode')?.trim().toUpperCase() ?? '';
    const normalizedIssue = issueCode.trim().toUpperCase();

    this.projectCode.set(projectCode);
    this.editingTitle.set(false);
    this.descriptionDirty.set(false);
    this.saveError.set(null);

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
    } catch (err) {
      this.loadError.set(problemDetailMessage(err as HttpErrorResponse));
      this.task.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
