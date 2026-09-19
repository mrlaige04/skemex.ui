import { HttpErrorResponse } from '@angular/common/http';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDragStart,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleDot, lucideLayers, lucidePlus, lucideSparkles } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import { problemDetailMessage } from '../../http/problem-details';
import type { ProjectColumnDto, ProjectTaskDto, ProjectTaskUserDto } from '../../models/projects/projects.models';
import { projectSectionPath } from '../../routing/app-paths';
import { AiChatService } from '../../services/ai-chat/ai-chat.service';
import { ProjectsService } from '../../services/projects/projects.service';
import { TaskTypeBadgeComponent } from '../../shared/task-type-badge/task-type-badge.component';
import { TaskTagBadgeComponent } from '../../shared/task-tag-badge/task-tag-badge.component';
import { stripHtmlToPlainText } from '../../shared/rich-text/rich-text.util';

interface BoardTask {
  id: string;
  parentId?: string | null;
  code: string;
  type: string;
  title: string;
  description?: string | null;
  tags: string[];
  assigneeInitials?: string;
  assigneeAvatarUrl?: string | null;
  assigneeName?: string;
  subtasks: BoardTask[];
}

interface BoardColumn {
  id: string;
  title: string;
  tasks: BoardTask[];
}

function initials(user: ProjectTaskUserDto | null | undefined): string | undefined {
  if (!user) {
    return undefined;
  }

  const fromName = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.trim();
  if (fromName) {
    return fromName.toUpperCase();
  }

  return (user.email[0] ?? '?').toUpperCase();
}

function assigneeDisplayName(user: ProjectTaskUserDto | null | undefined): string | undefined {
  if (!user) {
    return undefined;
  }
  const full = `${user.firstName} ${user.lastName}`.trim();
  return full || user.email || undefined;
}

function mapTask(task: ProjectTaskDto): BoardTask {
  return {
    id: task.id,
    parentId: task.parentId ?? null,
    code: task.code,
    type: task.type?.trim() || 'Task',
    title: task.title,
    description: stripHtmlToPlainText(task.description),
    tags: (task.tags ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0),
    assigneeInitials: initials(task.assignee),
    assigneeAvatarUrl: task.assignee?.avatarUrl ?? null,
    assigneeName: assigneeDisplayName(task.assignee),
    subtasks: task.subtasks.map(mapTask),
  };
}

function cloneTask(task: BoardTask): BoardTask {
  return {
    ...task,
    subtasks: task.subtasks.map(cloneTask),
  };
}

function cloneColumns(columns: BoardColumn[]): BoardColumn[] {
  return columns.map((column) => ({
    ...column,
    tasks: column.tasks.map(cloneTask),
  }));
}

function countTasks(tasks: BoardTask[]): number {
  return tasks.reduce((total, task) => total + 1 + countTasks(task.subtasks), 0);
}

function collectTaskIds(task: BoardTask): string[] {
  return [task.id, ...task.subtasks.flatMap(collectTaskIds)];
}

function removeTaskFromBoard(columns: BoardColumn[], taskId: string): BoardTask | null {
  for (const column of columns) {
    const rootIndex = column.tasks.findIndex((task) => task.id === taskId);
    if (rootIndex >= 0) {
      const [removed] = column.tasks.splice(rootIndex, 1);
      return removed ?? null;
    }

    for (const parent of column.tasks) {
      const subIndex = parent.subtasks.findIndex((task) => task.id === taskId);
      if (subIndex >= 0) {
        const [removed] = parent.subtasks.splice(subIndex, 1);
        return removed ?? null;
      }
    }
  }

  return null;
}

function insertTaskIntoColumn(
  columns: BoardColumn[],
  columnId: string,
  task: BoardTask,
  index: number,
): void {
  const column = columns.find((entry) => entry.id === columnId);
  if (!column) {
    return;
  }

  if (task.parentId) {
    const parent = column.tasks.find((entry) => entry.id === task.parentId);
    if (parent) {
      parent.subtasks = [...parent.subtasks, cloneTask({ ...task, subtasks: task.subtasks })];
      return;
    }
  }

  const insertAt = Math.max(0, Math.min(index, column.tasks.length));
  column.tasks.splice(insertAt, 0, cloneTask(task));
}

function mapColumnsToBoard(columns: ProjectColumnDto[], tasksByColumnId: Map<string, ProjectTaskDto[]>): BoardColumn[] {
  return [...columns]
    .sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title))
    .map((column) => ({
      id: column.id,
      title: column.title,
      tasks: (tasksByColumnId.get(column.id) ?? []).map(mapTask),
    }));
}

@Component({
  selector: 'app-project-board-page',
  imports: [
    RouterLink,
    NgIcon,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    CdkDropList,
    CdkDropListGroup,
    CdkScrollable,
    TaskTypeBadgeComponent,
    TaskTagBadgeComponent,
    ...HlmButtonImports,
    ...HlmIconImports,
  ],
  providers: [provideIcons({ lucideCircleDot, lucideLayers, lucidePlus, lucideSparkles })],
  templateUrl: './project-board-page.component.html',
  styleUrl: './project-board-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full min-h-0 overflow-hidden' },
})
export class ProjectBoardPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly aiChat = inject(AiChatService);

  readonly loading = signal(true);
  readonly moving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly moveError = signal<string | null>(null);
  readonly columns = signal<BoardColumn[]>([]);
  readonly createTaskLink = signal<string[]>(['/']);
  /** Keeps a local white slot under the root card while a nested subtask is dragged. */
  readonly draggingNestedSubtaskId = signal<string | null>(null);
  readonly nestedSubtaskPlaceholderHeight = signal(0);
  private readonly failedAssigneeAvatarIds = signal<Set<string>>(new Set());

  private projectId: string | null = null;
  private projectCode = '';

  ngOnInit(): void {
    void this.loadBoard();
  }

  taskCount(column: BoardColumn): number {
    return countTasks(column.tasks);
  }

  showAssigneeAvatar(task: BoardTask): boolean {
    const url = task.assigneeAvatarUrl?.trim();
    return !!url && !this.failedAssigneeAvatarIds().has(task.id);
  }

  onAssigneeAvatarError(taskId: string): void {
    this.failedAssigneeAvatarIds.update((current) => {
      const next = new Set(current);
      next.add(taskId);
      return next;
    });
  }

  openIssue(event: Event, issueCode: string): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.projectCode || !issueCode) {
      return;
    }
    void this.router.navigate(projectSectionPath(this.projectCode, `issues/${issueCode}`));
  }

  prepareNestedSubtaskDrag(event: Event): void {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) {
      return;
    }
    const height = target.getBoundingClientRect().height;
    if (height > 0) {
      this.nestedSubtaskPlaceholderHeight.set(height);
    }
  }

  onNestedSubtaskDragStarted(_event: CdkDragStart, subtaskId: string): void {
    // Preview is already created by CDK. Reserve local space and hide the source in the
    // same turn so the parent card does not collapse/flicker.
    if (this.nestedSubtaskPlaceholderHeight() <= 0) {
      this.nestedSubtaskPlaceholderHeight.set(44);
    }
    this.draggingNestedSubtaskId.set(subtaskId);
    this.cdr.detectChanges();
  }

  onNestedSubtaskDragEnded(): void {
    this.draggingNestedSubtaskId.set(null);
    this.nestedSubtaskPlaceholderHeight.set(0);
  }

  onDrop(event: CdkDragDrop<BoardTask[]>): void {
    this.draggingNestedSubtaskId.set(null);
    this.nestedSubtaskPlaceholderHeight.set(0);

    const dragged = event.item.data as BoardTask | undefined;
    if (!dragged?.id) {
      return;
    }

    const targetColumnId = event.container.id;
    const sourceColumnId = event.previousContainer.id;
    const previousSnapshot = cloneColumns(this.columns());
    const columns = cloneColumns(this.columns());

    const removed = removeTaskFromBoard(columns, dragged.id);
    if (!removed) {
      return;
    }

    insertTaskIntoColumn(columns, targetColumnId, removed, event.currentIndex);
    this.columns.set(columns);
    this.moveError.set(null);

    if (sourceColumnId === targetColumnId || !this.projectId) {
      return;
    }

    void this.persistColumnChanges(collectTaskIds(removed), targetColumnId, previousSnapshot);
  }

  private async persistColumnChanges(
    taskIds: string[],
    targetColumnId: string,
    previousSnapshot: BoardColumn[],
  ): Promise<void> {
    if (!this.projectId || taskIds.length === 0) {
      return;
    }

    this.moving.set(true);
    try {
      for (const taskId of taskIds) {
        await this.projectsService.updateTask(this.projectId, taskId, {
          columnId: targetColumnId,
        });
      }
    } catch (err) {
      this.columns.set(previousSnapshot);
      this.moveError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.moving.set(false);
    }
  }

  private async loadBoard(): Promise<void> {
    const code = this.route.parent?.snapshot.paramMap.get('projectCode')?.trim().toUpperCase() ?? '';

    if (!code) {
      this.loading.set(false);
      this.loadError.set('Project was not found.');
      this.columns.set([]);
      return;
    }

    this.createTaskLink.set(projectSectionPath(code, 'tasks/new'));
    this.projectCode = code;
    this.loading.set(true);
    this.loadError.set(null);

    try {
      const project = await this.projectsService.getByCode(code);
      if (!project) {
        this.loadError.set('Project was not found.');
        this.columns.set([]);
        this.projectId = null;
        return;
      }

      this.projectId = project.id;
      const projectColumns = await this.projectsService.listColumns(project.id);
      const tasksByColumn = await Promise.all(
        projectColumns.map(async (column) => {
          const tasks = await this.projectsService.listTasksByColumn(project.id, column.id);
          return [column.id, tasks] as const;
        }),
      );

      this.columns.set(mapColumnsToBoard(projectColumns, new Map(tasksByColumn)));
    } catch (err) {
      this.loadError.set(problemDetailMessage(err as HttpErrorResponse));
      this.columns.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
