import { HttpErrorResponse } from '@angular/common/http';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
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

interface BoardTask {
  id: string;
  code: string;
  title: string;
  description?: string | null;
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
    code: task.code,
    title: task.title,
    description: task.description,
    assigneeInitials: initials(task.assignee),
    assigneeAvatarUrl: task.assignee?.avatarUrl ?? null,
    assigneeName: assigneeDisplayName(task.assignee),
    subtasks: task.subtasks.map(mapTask),
  };
}

function countTasks(tasks: BoardTask[]): number {
  return tasks.reduce((total, task) => total + 1 + countTasks(task.subtasks), 0);
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
  imports: [RouterLink, NgIcon, CdkDrag, CdkDropList, CdkDropListGroup, CdkScrollable, ...HlmButtonImports, ...HlmIconImports],
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
  readonly aiChat = inject(AiChatService);

  readonly loading = signal(true);
  readonly moving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly moveError = signal<string | null>(null);
  readonly columns = signal<BoardColumn[]>([]);
  readonly createTaskLink = signal<string[]>(['/']);
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

  onDrop(event: CdkDragDrop<BoardTask[]>): void {
    const taskId = event.previousContainer.data[event.previousIndex]?.id;
    const targetColumnId = event.container.id;
    const previousSnapshot = this.columns();
    const movedBetweenColumns = event.previousContainer !== event.container;

    const columns = this.columns().map((column) => ({
      ...column,
      tasks: [...column.tasks],
    }));

    const tasksFor = (containerId: string): BoardTask[] | null => {
      const column = columns.find((entry) => entry.id === containerId);
      return column?.tasks ?? null;
    };

    const previousTasks = tasksFor(event.previousContainer.id);
    const currentTasks = tasksFor(event.container.id);
    if (!previousTasks || !currentTasks) {
      return;
    }

    if (movedBetweenColumns) {
      transferArrayItem(previousTasks, currentTasks, event.previousIndex, event.currentIndex);
    } else {
      moveItemInArray(currentTasks, event.previousIndex, event.currentIndex);
      this.columns.set(columns);
      return;
    }

    this.columns.set(columns);
    this.moveError.set(null);

    if (!taskId || !this.projectId) {
      return;
    }

    void this.persistColumnChange(taskId, targetColumnId, previousSnapshot);
  }

  private async persistColumnChange(
    taskId: string,
    targetColumnId: string,
    previousSnapshot: BoardColumn[],
  ): Promise<void> {
    if (!this.projectId) {
      return;
    }

    this.moving.set(true);
    try {
      await this.projectsService.updateTask(this.projectId, taskId, {
        columnId: targetColumnId,
      });
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
