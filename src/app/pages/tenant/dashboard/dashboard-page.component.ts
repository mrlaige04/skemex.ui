import { isPlatformBrowser, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideArrowRight,
  lucideCircleDot,
  lucideClipboardList,
  lucideFolderKanban,
  lucideInbox,
  lucidePlus,
  lucideRefreshCw,
  lucideUser,
  lucideUsers,
} from '@ng-icons/lucide';
import type { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import { problemDetailMessage } from '../../../http/problem-details';
import type { ProjectDto, ProjectTaskDto } from '../../../models/projects/projects.models';
import { APP_PATHS } from '../../../routing/app-paths';
import { AuthService } from '../../../services/auth/auth.service';
import { ProjectsService } from '../../../services/projects/projects.service';
import { UsersService } from '../../../services/users/users.service';
import {
  barOptions,
  buildWeeklyCreatedSeries,
  collectDescendantCreatedAts,
  collectRootCreatedAts,
  computeDecompositionStats,
  decompositionBarData,
  decompositionTrendLineData,
  doughnutOptions,
  emptyChartData,
  lineOptions,
  ownershipDoughnutData,
  projectBarData,
  splitProgressDoughnutData,
  statusDoughnutData,
  verticalBarOptions,
  type DecompositionStats,
} from './dashboard-charts';

export interface DashboardTaskRow {
  id: string;
  code: string;
  title: string;
  columnTitle: string;
  projectCode: string;
  projectName: string;
  assigneeLabel: string | null;
  assigneeEmail: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  isDone: boolean;
}

export interface StatusBucket {
  label: string;
  count: number;
  pct: number;
}

export interface ProjectBucket {
  code: string;
  name: string;
  count: number;
  pct: number;
  createdAt: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [BaseChartDirective, DatePipe, RouterLink, NgIcon, ...HlmButtonImports, ...HlmIconImports],
  providers: [
    provideCharts(withDefaultRegisterables()),
    provideIcons({
      lucideAlertCircle,
      lucideArrowRight,
      lucideCircleDot,
      lucideClipboardList,
      lucideFolderKanban,
      lucideInbox,
      lucidePlus,
      lucideRefreshCw,
      lucideUser,
      lucideUsers,
    }),
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0 overflow-y-auto' },
})
export class DashboardPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly projectsService = inject(ProjectsService);
  private readonly usersService = inject(UsersService);
  readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly projectCount = signal(0);
  readonly taskCount = signal(0);
  readonly unassignedCount = signal(0);
  readonly memberCount = signal(0);
  readonly doneCount = signal(0);

  readonly statusBuckets = signal<StatusBucket[]>([]);
  readonly projectBuckets = signal<ProjectBucket[]>([]);
  readonly myTasks = signal<DashboardTaskRow[]>([]);
  readonly unassignedTasks = signal<DashboardTaskRow[]>([]);
  readonly recentTasks = signal<DashboardTaskRow[]>([]);
  readonly recentProjects = signal<ProjectDto[]>([]);

  readonly statusChartData = signal<ChartData<'doughnut'>>(emptyChartData('doughnut') as ChartData<'doughnut'>);
  readonly projectChartData = signal<ChartData<'bar'>>(emptyChartData('bar') as ChartData<'bar'>);
  readonly ownershipChartData = signal<ChartData<'doughnut'>>(emptyChartData('doughnut') as ChartData<'doughnut'>);
  readonly decompositionChartData = signal<ChartData<'bar'>>(emptyChartData('bar') as ChartData<'bar'>);
  readonly splitProgressChartData = signal<ChartData<'doughnut'>>(
    emptyChartData('doughnut') as ChartData<'doughnut'>,
  );
  readonly decompositionTrendData = signal<ChartData<'line'>>(emptyChartData('line') as ChartData<'line'>);
  readonly decomposition = signal<DecompositionStats>({
    goalsQueued: 0,
    goalsSplit: 0,
    goalsAwaiting: 0,
    subtasksProduced: 0,
    avgSubtasksPerSplit: 0,
  });

  readonly doughnutOptions: ChartConfiguration<'doughnut'>['options'] = doughnutOptions;
  readonly barOptions: ChartConfiguration<'bar'>['options'] = barOptions;
  readonly verticalBarOptions: ChartConfiguration<'bar'>['options'] = verticalBarOptions;
  readonly lineOptions: ChartConfiguration<'line'>['options'] = lineOptions;

  readonly paths = APP_PATHS;

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning';
    }
    if (hour < 18) {
      return 'Good afternoon';
    }
    return 'Good evening';
  });

  readonly displayName = computed(() => {
    const ws = this.auth.workspaceContext();
    const full = `${ws?.firstName?.trim() ?? ''} ${ws?.lastName?.trim() ?? ''}`.trim();
    if (full) {
      return full;
    }
    const email = ws?.userEmail?.trim() ?? '';
    return email.split('@')[0] || 'there';
  });

  readonly tenantName = computed(() => this.auth.workspaceContext()?.tenantName?.trim() || 'Workspace');

  readonly completionPct = computed(() => {
    const total = this.taskCount();
    if (total <= 0) {
      return 0;
    }
    return Math.round((this.doneCount() / total) * 100);
  });

  readonly hasChartData = computed(
    () => this.statusBuckets().length > 0 || this.projectBuckets().length > 0 || this.taskCount() > 0,
  );

  ngOnInit(): void {
    void this.load();
  }

  refresh(): void {
    void this.load();
  }

  issueLink(task: DashboardTaskRow): string[] {
    return [APP_PATHS.projectIssue(task.projectCode, task.code)];
  }

  projectBoardLink(code: string): string[] {
    return [APP_PATHS.projectBoard(code)];
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [projectsPage, usersPage] = await Promise.all([
        this.projectsService.list(undefined, 1, 100),
        this.usersService.list(undefined, 1, 100),
      ]);

      const projects = projectsPage.items;
      this.projectCount.set(projectsPage.totalItems);
      this.memberCount.set(usersPage.totalItems);
      this.recentProjects.set(
        [...projects].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5),
      );

      const myEmail = (this.auth.workspaceContext()?.userEmail ?? '').trim().toLowerCase();

      const taskPages = await Promise.all(
        projects.map(async (project) => {
          try {
            const page = await this.projectsService.listTasks(project.id, {
              page: 1,
              pageSize: 100,
              sort: 'createdAtDesc',
            });
            return { project, page };
          } catch {
            return {
              project,
              page: { items: [] as ProjectTaskDto[], totalItems: 0, pageNumber: 1, pageSize: 100 },
            };
          }
        }),
      );

      const rows: DashboardTaskRow[] = [];
      let reportedTotal = 0;
      const statusMap = new Map<string, number>();
      const projectMap = new Map<string, { name: string; code: string; count: number; createdAt: string }>();
      const rootTasks: ProjectTaskDto[] = [];

      for (const { project, page } of taskPages) {
        reportedTotal += page.totalItems;
        projectMap.set(project.id, {
          name: project.name,
          code: project.code,
          count: page.totalItems,
          createdAt: project.createdAt,
        });

        for (const task of page.items) {
          rootTasks.push(task);
          this.collectTaskTree(task, project, rows, statusMap);
        }
      }

      this.taskCount.set(Math.max(reportedTotal, rows.length));

      const decomp = computeDecompositionStats(rootTasks);
      this.decomposition.set(decomp);
      this.decompositionChartData.set(
        decompositionBarData(decomp.goalsQueued, decomp.goalsSplit, decomp.subtasksProduced),
      );
      this.splitProgressChartData.set(
        splitProgressDoughnutData(decomp.goalsAwaiting, decomp.goalsSplit),
      );

      const queuedWeekly = buildWeeklyCreatedSeries(collectRootCreatedAts(rootTasks), 8);
      const producedWeekly = buildWeeklyCreatedSeries(collectDescendantCreatedAts(rootTasks), 8);
      this.decompositionTrendData.set(
        decompositionTrendLineData(queuedWeekly.labels, queuedWeekly.values, producedWeekly.values),
      );

      let done = 0;
      let unassignedOpen = 0;
      let assignedOpen = 0;
      for (const row of rows) {
        if (row.isDone) {
          done += 1;
        } else if (!row.assigneeEmail) {
          unassignedOpen += 1;
        } else {
          assignedOpen += 1;
        }
      }
      this.doneCount.set(done);
      this.unassignedCount.set(unassignedOpen);

      const statusEntries = [...statusMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      const statusTotal = statusEntries.reduce((a, [, c]) => a + c, 0) || 1;
      this.statusBuckets.set(
        statusEntries.map(([label, count]) => ({
          label,
          count,
          pct: Math.round((count / statusTotal) * 100),
        })),
      );
      this.statusChartData.set(
        statusDoughnutData(
          statusEntries.map(([label]) => label),
          statusEntries.map(([, count]) => count),
        ),
      );

      const projectEntries = [...projectMap.values()].sort((a, b) => b.count - a.count).slice(0, 6);
      const projectMax = Math.max(1, ...projectEntries.map((p) => p.count));
      this.projectBuckets.set(
        projectEntries.map((p) => ({
          code: p.code,
          name: p.name,
          count: p.count,
          pct: Math.round((p.count / projectMax) * 100),
          createdAt: p.createdAt,
        })),
      );
      this.projectChartData.set(
        projectBarData(
          projectEntries.map((p) => p.code),
          projectEntries.map((p) => p.count),
        ),
      );

      this.ownershipChartData.set(ownershipDoughnutData(assignedOpen, unassignedOpen, done));

      this.myTasks.set(
        rows
          .filter((r) => !!r.assigneeEmail && r.assigneeEmail === myEmail && !r.isDone)
          .sort((a, b) => this.activityTime(b) - this.activityTime(a))
          .slice(0, 8),
      );

      this.unassignedTasks.set(
        rows
          .filter((r) => !r.assigneeEmail && !r.isDone)
          .sort((a, b) => this.activityTime(b) - this.activityTime(a))
          .slice(0, 8),
      );

      this.recentTasks.set(
        [...rows].sort((a, b) => this.activityTime(b) - this.activityTime(a)).slice(0, 8),
      );
    } catch (err) {
      const message =
        err instanceof HttpErrorResponse ? problemDetailMessage(err) : 'Could not load dashboard.';
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  private collectTaskTree(
    task: ProjectTaskDto,
    project: ProjectDto,
    rows: DashboardTaskRow[],
    statusMap: Map<string, number>,
  ): void {
    const columnTitle = (task.columnTitle ?? task.columnKey ?? 'Unknown').trim() || 'Unknown';
    const isDone = this.isDoneColumn(task.columnKey, task.columnTitle);
    statusMap.set(columnTitle, (statusMap.get(columnTitle) ?? 0) + 1);

    const assignee = task.assignee;
    rows.push({
      id: task.id,
      code: task.code,
      title: task.title,
      columnTitle,
      projectCode: project.code,
      projectName: project.name,
      assigneeLabel: assignee
        ? `${assignee.firstName} ${assignee.lastName}`.trim() || assignee.email
        : null,
      assigneeEmail: assignee?.email?.trim().toLowerCase() ?? null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      isDone,
    });

    for (const sub of task.subtasks ?? []) {
      this.collectTaskTree(sub, project, rows, statusMap);
    }
  }

  private isDoneColumn(key?: string, title?: string): boolean {
    const hay = `${key ?? ''} ${title ?? ''}`.toLowerCase();
    return /done|complete|closed|finished|shipped/.test(hay);
  }

  private activityTime(row: DashboardTaskRow): number {
    const raw = row.updatedAt || row.createdAt;
    if (!raw) {
      return 0;
    }
    const t = Date.parse(raw);
    return Number.isFinite(t) ? t : 0;
  }
}
