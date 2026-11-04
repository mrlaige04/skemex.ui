import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideLoaderCircle,
  lucideMaximize2,
  lucideNetwork,
  lucideRefreshCw,
} from '@ng-icons/lucide';
import cytoscape, { type Core } from 'cytoscape';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import {
  isTransientHttpFailure,
  problemDetailMessage,
  problemDetailMessageAsync,
} from '../../http/problem-details';
import type { ProjectTaskGraphDto } from '../../models/projects/projects.models';
import { APP_PATHS } from '../../routing/app-paths';
import { ProjectsService } from '../../services/projects/projects.service';
import {
  buildCytoElements,
  cytoLayout,
  cytoStylesheet,
  parentRoots,
  type TaskGraphEdgeFilter,
} from './task-graph-cyto';

@Component({
  selector: 'app-project-task-graph-page',
  imports: [NgIcon, ...HlmButtonImports, ...HlmIconImports],
  providers: [
    provideIcons({
      lucideLoaderCircle,
      lucideMaximize2,
      lucideNetwork,
      lucideRefreshCw,
    }),
  ],
  templateUrl: './project-task-graph-page.component.html',
  styleUrl: './project-task-graph-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'min-h-0 overflow-hidden' },
})
export class ProjectTaskGraphPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly host = viewChild<ElementRef<HTMLDivElement>>('graphHost');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly truncated = signal(false);
  readonly nodeCount = signal(0);
  readonly edgeCount = signal(0);
  readonly edgeFilter = signal<TaskGraphEdgeFilter>('all');

  private projectCode = '';
  private graph: ProjectTaskGraphDto | null = null;
  private cy: Core | null = null;

  constructor() {
    afterNextRender(() => {
      if (this.graph && !this.cy) {
        this.renderGraph();
      }
    });
  }

  ngOnInit(): void {
    this.route.parent?.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      void this.load();
    });
  }

  ngOnDestroy(): void {
    this.destroyGraph();
  }

  async reload(): Promise<void> {
    await this.load();
  }

  setEdgeFilter(filter: TaskGraphEdgeFilter): void {
    if (this.edgeFilter() === filter) {
      return;
    }
    this.edgeFilter.set(filter);
    this.renderGraph();
  }

  fitView(): void {
    this.cy?.fit(undefined, 48);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const code = this.route.parent?.snapshot.paramMap.get('projectCode')?.trim() ?? '';
    this.projectCode = code;
    if (!code) {
      this.loading.set(false);
      this.error.set('Project was not found.');
      return;
    }

    try {
      const project = await this.projectsService.getByCode(code);
      if (!project) {
        this.loading.set(false);
        this.error.set('Project was not found.');
        return;
      }

      this.projectCode = project.code;
      const graph = await this.projectsService.getTaskGraph(project.id);
      this.graph = graph;
      this.truncated.set(graph.truncated);
      this.nodeCount.set(graph.nodes.length);
      this.edgeCount.set(graph.edges.length);
      this.loading.set(false);
      this.renderGraph();
    } catch (err) {
      this.loading.set(false);
      this.graph = null;
      this.destroyGraph();
      if (isTransientHttpFailure(err)) {
        return;
      }
      const message =
        err instanceof HttpErrorResponse
          ? await problemDetailMessageAsync(err)
          : problemDetailMessage(err);
      this.error.set(message || 'Could not load the task graph.');
    }
  }

  private renderGraph(): void {
    if (!this.isBrowser || !this.graph) {
      return;
    }

    const container = this.host()?.nativeElement;
    if (!container) {
      return;
    }

    const filter = this.edgeFilter();
    const elements = buildCytoElements(this.graph, filter);
    const layout = cytoLayout(filter);

    if (filter !== 'relations') {
      const roots = parentRoots(this.graph.edges.filter((e) => includeForLayout(e.kind, filter)));
      if (roots) {
        (layout as { roots?: string[] }).roots = roots;
      }
    }

    this.destroyGraph();

    this.cy = cytoscape({
      container,
      elements,
      style: cytoStylesheet(),
      layout,
      minZoom: 0.15,
      maxZoom: 3,
      wheelSensitivity: 0.25,
      boxSelectionEnabled: false,
      autoungrabify: false,
      userPanningEnabled: true,
      userZoomingEnabled: true,
    });

    this.cy.on('dbltap', 'node', (event) => {
      const code = String(event.target.data('code') ?? '').trim();
      if (!code || !this.projectCode) {
        return;
      }
      void this.router.navigateByUrl(APP_PATHS.projectIssue(this.projectCode, code));
    });

    this.cy.fit(undefined, 48);
  }

  private destroyGraph(): void {
    this.cy?.destroy();
    this.cy = null;
  }
}

function includeForLayout(kind: string, filter: TaskGraphEdgeFilter): boolean {
  if (filter === 'hierarchy') {
    return kind === 'ParentOf';
  }
  if (filter === 'relations') {
    return kind !== 'ParentOf';
  }
  return true;
}
