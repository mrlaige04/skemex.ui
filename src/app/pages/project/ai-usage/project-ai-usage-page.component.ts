import { DecimalPipe, isPlatformBrowser } from '@angular/common';
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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideActivity,
  lucideClock3,
  lucideCoins,
  lucideList,
  lucidePercent,
  lucideRefreshCw,
  lucideSparkles,
  lucideZap,
} from '@ng-icons/lucide';
import type { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import { problemDetailMessage } from '../../../http/problem-details';
import type { ProjectAiUsageSummaryDto } from '../../../models/ai-usage/ai-usage.models';
import { APP_PATHS, projectSectionPath } from '../../../routing/app-paths';
import { AiUsageService } from '../../../services/ai-usage/ai-usage.service';
import { ProjectsService } from '../../../services/projects/projects.service';
import {
  barOptions,
  doughnutOptions,
  emptyChartData,
  lineOptions,
  verticalBarOptions,
} from '../../tenant/dashboard/dashboard-charts';
import {
  formatCompactNumber,
  formatLatency,
  modelTokensBarData,
  operationNameBarData,
  operationTypeDoughnutData,
  tokensTrendLineData,
} from './project-ai-usage-charts';

type RangeKey = '7d' | '30d' | '90d';

@Component({
  selector: 'app-project-ai-usage-page',
  imports: [
    BaseChartDirective,
    DecimalPipe,
    RouterLink,
    NgIcon,
    ...HlmButtonImports,
    ...HlmIconImports,
  ],
  providers: [
    provideCharts(withDefaultRegisterables()),
    provideIcons({
      lucideActivity,
      lucideClock3,
      lucideCoins,
      lucideList,
      lucidePercent,
      lucideRefreshCw,
      lucideSparkles,
      lucideZap,
    }),
  ],
  templateUrl: './project-ai-usage-page.component.html',
  styleUrl: './project-ai-usage-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0 overflow-y-auto' },
})
export class ProjectAiUsagePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);
  private readonly aiUsageService = inject(AiUsageService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly projectId = signal<string | null>(null);
  readonly projectCode = signal('');
  readonly projectName = signal('');
  readonly range = signal<RangeKey>('30d');
  readonly summary = signal<ProjectAiUsageSummaryDto | null>(null);

  readonly chartsReady = computed(() => isPlatformBrowser(this.platformId));

  readonly totalTokensLabel = computed(() => formatCompactNumber(this.summary()?.totalTokens ?? 0));
  readonly avgLatencyLabel = computed(() => formatLatency(this.summary()?.averageLatencyMs ?? 0));
  readonly successRateLabel = computed(() => `${(this.summary()?.successRate ?? 0).toFixed(1)}%`);
  readonly operationsLabel = computed(() =>
    formatCompactNumber(this.summary()?.totalOperations ?? 0),
  );

  readonly tokensLineData = signal<ChartData<'line'>>(emptyChartData('line') as ChartData<'line'>);
  readonly typeDoughnutData = signal<ChartData<'doughnut'>>(
    emptyChartData('doughnut') as ChartData<'doughnut'>,
  );
  readonly nameBarData = signal<ChartData<'bar'>>(emptyChartData('bar') as ChartData<'bar'>);
  readonly modelBarData = signal<ChartData<'bar'>>(emptyChartData('bar') as ChartData<'bar'>);

  readonly lineOptions = {
    ...lineOptions,
    scales: {
      ...lineOptions?.scales,
      y1: {
        position: 'right' as const,
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: { precision: 0 },
      },
    },
  } as ChartConfiguration<'line'>['options'];
  readonly doughnutOptions = doughnutOptions;
  readonly barOptions = barOptions;
  readonly verticalBarOptions = verticalBarOptions;

  readonly historyLink = computed(() =>
    projectSectionPath(this.projectCode(), 'ai-usage/history'),
  );

  ngOnInit(): void {
    void this.bootstrap();
  }

  setRange(range: RangeKey): void {
    if (this.range() === range) {
      return;
    }
    this.range.set(range);
    void this.loadSummary();
  }

  refresh(): void {
    void this.loadSummary();
  }

  private async bootstrap(): Promise<void> {
    const code = this.route.parent?.snapshot.paramMap.get('projectCode')
      ?? this.route.snapshot.paramMap.get('projectCode')
      ?? '';
    this.projectCode.set(code);
    this.loading.set(true);
    this.error.set(null);

    try {
      const project = await this.projectsService.getByCode(code);
      if (!project) {
        this.error.set('Project was not found.');
        this.loading.set(false);
        return;
      }
      this.projectId.set(project.id);
      this.projectName.set(project.name);
      await this.loadSummary();
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
      this.loading.set(false);
    }
  }

  private async loadSummary(): Promise<void> {
    const projectId = this.projectId();
    if (!projectId) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    try {
      const { from, to } = rangeBounds(this.range());
      const summary = await this.aiUsageService.getSummary(projectId, from, to);
      this.summary.set(summary);
      this.tokensLineData.set(tokensTrendLineData(summary.daily));
      this.typeDoughnutData.set(operationTypeDoughnutData(summary.byOperationType));
      this.nameBarData.set(operationNameBarData(summary.byOperationName));
      this.modelBarData.set(modelTokensBarData(summary.byModel));
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
      this.summary.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly paths = APP_PATHS;
}

function rangeBounds(range: RangeKey): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  from.setUTCDate(from.getUTCDate() - (days - 1));
  from.setUTCHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}
