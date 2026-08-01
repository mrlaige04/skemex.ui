import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideSearch, lucideSparkles, lucideTrash2 } from '@ng-icons/lucide';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmLabelImports } from 'spartan/label';
import { HlmSelectImports } from 'spartan/select';
import { problemDetailMessage, isTransientHttpFailure } from '../../http/problem-details';
import type {
  ProjectColumnDto,
  ProjectTaskDto,
  ProjectTaskSort,
  ProjectUserDto,
} from '../../models/projects/projects.models';
import { APP_PATHS } from '../../routing/app-paths';
import { AiChatService } from '../../services/ai-chat/ai-chat.service';
import { ProjectsService } from '../../services/projects/projects.service';
import { ConfirmAlertDialogComponent } from '../../shared/confirm-alert-dialog/confirm-alert-dialog.component';
import {
  RichTableComponent,
  type RichTableColumn,
  type RichTablePaginationChange,
} from '../../shared/rich-table';
import { IssuesKeyCellComponent } from './issues-key-cell.component';
import { IssuesPersonCellComponent } from './issues-person-cell.component';
import { IssuesTableActionsCellComponent } from './issues-table-actions-cell.component';
import {
  PROJECT_ISSUES_TABLE_HOST,
  type ProjectIssuesTableHost,
} from './project-issues-table-host';

const ALL_VALUE = '__all__';
const UNASSIGNED_VALUE = '__unassigned__';

const SORT_OPTIONS: Array<{ value: ProjectTaskSort; label: string }> = [
  { value: 'createdAtDesc', label: 'Newest first' },
  { value: 'createdAtAsc', label: 'Oldest first' },
  { value: 'titleAsc', label: 'Title A–Z' },
  { value: 'titleDesc', label: 'Title Z–A' },
  { value: 'codeAsc', label: 'Code A–Z' },
  { value: 'codeDesc', label: 'Code Z–A' },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso?: string): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function personName(user?: { firstName: string; lastName: string; email: string } | null): string {
  if (!user) {
    return 'Unassigned';
  }
  const full = `${user.firstName} ${user.lastName}`.trim();
  return full || user.email || '—';
}

@Component({
  selector: 'app-project-issues-page',
  imports: [
    RouterLink,
    NgIcon,
    RichTableComponent,
    ConfirmAlertDialogComponent,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
  ],
  providers: [
    provideIcons({ lucidePlus, lucideSearch, lucideSparkles, lucideTrash2 }),
    { provide: PROJECT_ISSUES_TABLE_HOST, useExisting: ProjectIssuesPageComponent },
  ],
  templateUrl: './project-issues-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0 overflow-y-auto' },
})
export class ProjectIssuesPageComponent implements OnInit, ProjectIssuesTableHost {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);
  private readonly destroyRef = inject(DestroyRef);
  readonly aiChat = inject(AiChatService);
  private readonly search$ = new Subject<string>();
  private readonly richTable = viewChild(RichTableComponent);

  readonly loading = signal(true);
  readonly listError = signal<string | null>(null);
  readonly projectName = signal('');
  readonly projectCode = signal('');
  readonly issues = signal<ProjectTaskDto[]>([]);
  readonly columns = signal<ProjectColumnDto[]>([]);
  readonly members = signal<ProjectUserDto[]>([]);

  readonly searchInput = signal('');
  readonly columnFilter = signal(ALL_VALUE);
  readonly assigneeFilter = signal(ALL_VALUE);
  readonly sort = signal<ProjectTaskSort>('createdAtDesc');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly createLink = signal<string[]>([]);

  readonly selectedIds = signal<string[]>([]);
  readonly deletingId = signal<string | null>(null);
  readonly bulkDeleting = signal(false);

  readonly confirmDialogState = signal<'open' | 'closed'>('closed');
  readonly confirmMode = signal<'single' | 'bulk'>('single');
  readonly pendingDeleteIssue = signal<ProjectTaskDto | null>(null);

  readonly allValue = ALL_VALUE;
  readonly unassignedValue = UNASSIGNED_VALUE;
  readonly sortOptions = SORT_OPTIONS;

  private projectId: string | null = null;
  private pagingEnabled = false;
  private suppressPagingEffect = false;

  readonly selectedCount = computed(() => this.selectedIds().length);
  readonly hasSelection = computed(() => this.selectedCount() > 0);

  readonly confirmTitle = computed(() =>
    this.confirmMode() === 'bulk' ? 'Delete selected issues?' : 'Delete issue?',
  );

  readonly confirmLabel = computed(() =>
    this.confirmMode() === 'bulk' ? 'Delete selected' : 'Delete',
  );

  readonly pendingDeleteLabel = computed(() => {
    const issue = this.pendingDeleteIssue();
    if (!issue) {
      return '';
    }
    return issue.code ? `${issue.code} — ${issue.title}` : issue.title;
  });

  readonly tableColumns: RichTableColumn<ProjectTaskDto>[] = [
    {
      key: 'code',
      label: 'Key',
      component: IssuesKeyCellComponent,
      enableHiding: false,
    },
    {
      key: 'title',
      label: 'Title',
      accessorFn: (row) => row.title,
      render: (row) =>
        `<span class="font-medium">${escapeHtml(row.title)}</span>${
          row.parentId
            ? '<span class="text-muted-foreground ml-2 text-xs">Sub-task</span>'
            : ''
        }`,
      enableHiding: false,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) =>
        `<span class="text-muted-foreground text-sm">${escapeHtml(row.columnTitle || '—')}</span>`,
    },
    {
      key: 'assignee',
      label: 'Assignee',
      component: IssuesPersonCellComponent,
      accessorFn: (row) => personName(row.assignee),
    },
    {
      key: 'reporter',
      label: 'Reporter',
      component: IssuesPersonCellComponent,
      accessorFn: (row) => personName(row.reporter),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (row) =>
        `<span class="text-muted-foreground text-sm">${escapeHtml(formatDate(row.createdAt))}</span>`,
    },
    {
      key: 'actions',
      label: 'Actions',
      header: '<span class="sr-only">Actions</span>',
      component: IssuesTableActionsCellComponent,
      enableHiding: false,
    },
  ];

  constructor() {
    effect(() => {
      this.currentPage();
      this.pageSize();
      if (!this.pagingEnabled || this.suppressPagingEffect || !this.projectId) {
        return;
      }
      void this.refreshList();
    });
  }

  ngOnInit(): void {
    void this.loadProject();

    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentPage.set(1);
        void this.refreshList();
      });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchInput.set(value);
    this.search$.next(value);
  }

  onColumnFilterChange(value: unknown): void {
    this.columnFilter.set(typeof value === 'string' ? value : ALL_VALUE);
    this.currentPage.set(1);
    void this.refreshList();
  }

  onAssigneeFilterChange(value: unknown): void {
    this.assigneeFilter.set(typeof value === 'string' ? value : ALL_VALUE);
    this.currentPage.set(1);
    void this.refreshList();
  }

  onSortChange(value: unknown): void {
    const next = typeof value === 'string' ? value : 'createdAtDesc';
    this.sort.set((SORT_OPTIONS.some((o) => o.value === next) ? next : 'createdAtDesc') as ProjectTaskSort);
    this.currentPage.set(1);
    void this.refreshList();
  }

  onPaginationChange(change: RichTablePaginationChange): void {
    this.currentPage.set(change.pageNumber);
    this.pageSize.set(change.page);
  }

  onRowSelectionChange(ids: string[]): void {
    this.selectedIds.set(ids);
  }

  deleteIssue(issue: ProjectTaskDto): void {
    this.confirmMode.set('single');
    this.pendingDeleteIssue.set(issue);
    this.confirmDialogState.set('open');
  }

  requestBulkDelete(): void {
    if (!this.hasSelection()) {
      return;
    }
    this.confirmMode.set('bulk');
    this.pendingDeleteIssue.set(null);
    this.confirmDialogState.set('open');
  }

  async confirmDelete(): Promise<void> {
    if (this.confirmMode() === 'bulk') {
      await this.performBulkDelete();
      return;
    }
    await this.performSingleDelete();
  }

  columnLabel = (value: unknown): string => {
    if (value === ALL_VALUE || value == null) {
      return 'All statuses';
    }
    const column = this.columns().find((c) => c.id === value);
    return column?.title ?? 'Status';
  };

  assigneeLabel = (value: unknown): string => {
    if (value === ALL_VALUE || value == null) {
      return 'All assignees';
    }
    if (value === UNASSIGNED_VALUE) {
      return 'Unassigned';
    }
    const user = this.members().find((m) => m.id === value);
    return user ? personName(user) : 'Assignee';
  };

  sortLabel = (value: unknown): string => {
    const option = SORT_OPTIONS.find((o) => o.value === value);
    return option?.label ?? 'Newest first';
  };

  private async performSingleDelete(): Promise<void> {
    const issue = this.pendingDeleteIssue();
    if (!this.projectId || !issue) {
      return;
    }

    this.deletingId.set(issue.id);
    this.listError.set(null);
    try {
      await this.projectsService.deleteTask(this.projectId, issue.projectColumnId, issue.id);
      this.pendingDeleteIssue.set(null);
      this.selectedIds.update((ids) => ids.filter((id) => id !== issue.id));
      await this.refreshList();
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.deletingId.set(null);
    }
  }

  private async performBulkDelete(): Promise<void> {
    const ids = this.selectedIds();
    if (!this.projectId || ids.length === 0) {
      return;
    }

    this.bulkDeleting.set(true);
    this.listError.set(null);
    try {
      await this.projectsService.bulkDeleteTasks(this.projectId, ids);
      this.selectedIds.set([]);
      this.richTable()?.clearRowSelection();
      await this.refreshList();
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.bulkDeleting.set(false);
    }
  }

  private async loadProject(): Promise<void> {
    const code = this.route.parent?.snapshot.paramMap.get('projectCode')?.trim() ?? '';
    if (!code) {
      this.loading.set(false);
      this.listError.set('Project was not found.');
      return;
    }

    this.loading.set(true);
    this.listError.set(null);
    try {
      const project = await this.projectsService.getByCode(code);
      if (!project) {
        this.listError.set('Project was not found.');
        this.projectId = null;
        return;
      }

      this.projectName.set(project.name);
      this.projectCode.set(project.code);
      this.projectId = project.id;
      this.createLink.set([APP_PATHS.projectTaskNew(project.code)]);

      const [columns, members] = await Promise.all([
        this.projectsService.listColumns(project.id),
        this.projectsService.listUsers(project.id, undefined, 1, 100),
      ]);
      this.columns.set(columns);
      this.members.set(members.items);
      await this.refreshList();
    } catch (err) {
      if (!isTransientHttpFailure(err)) {
        this.listError.set(problemDetailMessage(err as HttpErrorResponse));
      }
      this.projectId = null;
    } finally {
      this.loading.set(false);
    }
  }

  private async refreshList(): Promise<void> {
    if (!this.projectId) {
      return;
    }

    this.loading.set(true);
    this.listError.set(null);
    try {
      const columnId = this.columnFilter();
      const assignee = this.assigneeFilter();

      const page = await this.projectsService.listTasks(this.projectId, {
        search: this.searchInput(),
        columnId: columnId === ALL_VALUE ? null : columnId,
        assigneeId: assignee === ALL_VALUE || assignee === UNASSIGNED_VALUE ? null : assignee,
        unassigned: assignee === UNASSIGNED_VALUE,
        sort: this.sort(),
        page: this.currentPage(),
        pageSize: this.pageSize(),
      });

      this.issues.set(page.items);
      this.totalItems.set(page.totalItems);
      this.suppressPagingEffect = true;
      this.currentPage.set(page.pageNumber);
      this.pageSize.set(page.pageSize);
      this.suppressPagingEffect = false;
      this.pagingEnabled = true;
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
      this.issues.set([]);
      this.totalItems.set(0);
      this.pagingEnabled = true;
    } finally {
      this.loading.set(false);
    }
  }
}
