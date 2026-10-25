import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideChevronDown, lucideChevronRight, lucideSearch } from '@ng-icons/lucide';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmLabelImports } from 'spartan/label';
import { HlmNumberedPagination } from 'spartan/pagination';
import { HlmSelectImports } from 'spartan/select';
import { HlmTableImports } from 'spartan/table';
import { problemDetailMessage } from '../../../http/problem-details';
import type {
  AiUsageActivityDto,
  AiUsageActivitySort,
  AiUsageGroupDto,
  AiUsageOperationType,
} from '../../../models/ai-usage/ai-usage.models';
import { projectSectionPath } from '../../../routing/app-paths';
import { AiUsageService } from '../../../services/ai-usage/ai-usage.service';
import { ProjectsService } from '../../../services/projects/projects.service';
import { formatLatency, humanize } from './project-ai-usage-charts';

const ALL_VALUE = '__all__';

const OPERATION_TYPES: Array<{ value: string; label: string }> = [
  { value: ALL_VALUE, label: 'All types' },
  { value: 'ChatCompletion', label: 'Chat completion' },
  { value: 'FunctionCall', label: 'Function call' },
  { value: 'Embedding', label: 'Embedding' },
  { value: 'ToolExecution', label: 'Tool execution' },
];

const SUCCESS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: ALL_VALUE, label: 'Any status' },
  { value: 'true', label: 'Succeeded' },
  { value: 'false', label: 'Failed' },
];

const SORT_OPTIONS: Array<{ value: AiUsageActivitySort; label: string }> = [
  { value: 'createdAtDesc', label: 'Newest first' },
  { value: 'createdAtAsc', label: 'Oldest first' },
  { value: 'totalTokensDesc', label: 'Most tokens' },
  { value: 'totalTokensAsc', label: 'Fewest tokens' },
  { value: 'durationMsDesc', label: 'Slowest' },
  { value: 'durationMsAsc', label: 'Fastest' },
];

@Component({
  selector: 'app-project-ai-usage-history-page',
  imports: [
    DecimalPipe,
    RouterLink,
    NgIcon,
    HlmNumberedPagination,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
    ...HlmTableImports,
  ],
  providers: [
    provideIcons({ lucideArrowLeft, lucideChevronDown, lucideChevronRight, lucideSearch }),
  ],
  templateUrl: './project-ai-usage-history-page.component.html',
  styleUrl: './project-ai-usage-history-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0 overflow-y-auto' },
})
export class ProjectAiUsageHistoryPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);
  private readonly aiUsageService = inject(AiUsageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  readonly loading = signal(true);
  readonly listError = signal<string | null>(null);
  readonly projectName = signal('');
  readonly projectCode = signal('');
  readonly groups = signal<AiUsageGroupDto[]>([]);
  readonly expandedIds = signal<ReadonlySet<string>>(new Set());

  readonly searchInput = signal('');
  readonly typeFilter = signal(ALL_VALUE);
  readonly successFilter = signal(ALL_VALUE);
  readonly sort = signal<AiUsageActivitySort>('createdAtDesc');
  readonly currentPage = signal(1);
  readonly pageSize = signal(20);
  readonly totalItems = signal(0);

  readonly allValue = ALL_VALUE;
  readonly operationTypes = OPERATION_TYPES;
  readonly successOptions = SUCCESS_OPTIONS;
  readonly sortOptions = SORT_OPTIONS;

  readonly dashboardLink = signal<string[]>([]);

  private projectId: string | null = null;
  private pagingEnabled = false;
  private suppressPagingEffect = false;

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

  onTypeFilterChange(value: unknown): void {
    this.typeFilter.set(typeof value === 'string' ? value : ALL_VALUE);
    this.currentPage.set(1);
    void this.refreshList();
  }

  onSuccessFilterChange(value: unknown): void {
    this.successFilter.set(typeof value === 'string' ? value : ALL_VALUE);
    this.currentPage.set(1);
    void this.refreshList();
  }

  onSortChange(value: unknown): void {
    const next = typeof value === 'string' ? value : 'createdAtDesc';
    this.sort.set(
      (SORT_OPTIONS.some((option) => option.value === next) ? next : 'createdAtDesc') as AiUsageActivitySort,
    );
    this.currentPage.set(1);
    void this.refreshList();
  }

  onCurrentPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onItemsPerPageChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  toggleGroup(executionId: string): void {
    this.expandedIds.update((current) => {
      const next = new Set(current);
      if (next.has(executionId)) {
        next.delete(executionId);
      } else {
        next.add(executionId);
      }
      return next;
    });
  }

  isExpanded(executionId: string): boolean {
    return this.expandedIds().has(executionId);
  }

  typeLabel = (value: unknown): string =>
    OPERATION_TYPES.find((option) => option.value === value)?.label ?? 'All types';

  successLabel = (value: unknown): string =>
    SUCCESS_OPTIONS.find((option) => option.value === value)?.label ?? 'Any status';

  sortLabel = (value: unknown): string =>
    SORT_OPTIONS.find((option) => option.value === value)?.label ?? 'Newest first';

  formatWhen = formatDateTime;
  formatLatency = formatLatency;
  humanize = humanize;

  typeChips(group: AiUsageGroupDto): string {
    return group.operationTypes.map((type) => humanize(type)).join(' · ');
  }

  activityTokens(activity: AiUsageActivityDto): string {
    const total = (activity.totalTokens ?? 0).toLocaleString();
    if (activity.promptTokens == null && activity.completionTokens == null) {
      return total;
    }
    return `${total}`;
  }

  activityTokenDetail(activity: AiUsageActivityDto): string | null {
    if (activity.promptTokens == null && activity.completionTokens == null) {
      return null;
    }
    return `${activity.promptTokens ?? 0} prompt · ${activity.completionTokens ?? 0} completion`;
  }

  private async loadProject(): Promise<void> {
    const code =
      this.route.parent?.snapshot.paramMap.get('projectCode')
      ?? this.route.snapshot.paramMap.get('projectCode')
      ?? '';
    this.projectCode.set(code);
    this.dashboardLink.set(projectSectionPath(code, 'ai-usage'));
    this.loading.set(true);
    this.listError.set(null);

    try {
      const project = await this.projectsService.getByCode(code);
      if (!project) {
        this.listError.set('Project was not found.');
        this.loading.set(false);
        return;
      }

      this.projectId = project.id;
      this.projectName.set(project.name);
      this.pagingEnabled = true;
      await this.refreshList();
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
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
      const successRaw = this.successFilter();
      const typeRaw = this.typeFilter();
      const result = await this.aiUsageService.listGroups(this.projectId, {
        search: this.searchInput(),
        operationType: typeRaw === ALL_VALUE ? undefined : (typeRaw as AiUsageOperationType),
        success: successRaw === ALL_VALUE ? undefined : successRaw === 'true',
        sort: this.sort(),
        page: this.currentPage(),
        pageSize: this.pageSize(),
      });

      this.suppressPagingEffect = true;
      this.groups.set(result.items);
      this.totalItems.set(result.totalItems);
      this.currentPage.set(result.pageNumber);
      this.pageSize.set(result.pageSize);
      this.expandedIds.set(new Set());
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
      this.groups.set([]);
      this.totalItems.set(0);
    } finally {
      this.loading.set(false);
      Promise.resolve().then(() => {
        this.suppressPagingEffect = false;
      });
    }
  }
}

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
