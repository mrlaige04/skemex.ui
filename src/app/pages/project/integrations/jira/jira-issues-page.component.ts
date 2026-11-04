import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideRefreshCw, lucideSearch } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { problemDetailMessage } from '../../../../http/problem-details';
import type { JiraIssuePreviewDto } from '../../../../models/integrations/jira.models';
import { APP_PATHS } from '../../../../routing/app-paths';
import { findRouteParam } from '../../../../routing/find-route-param';
import { JiraIntegrationsService } from '../../../../services/integrations/jira-integrations.service';
import { ProjectsService } from '../../../../services/projects/projects.service';
import {
  RichTableComponent,
  type RichTableColumn,
  type RichTablePaginationChange,
} from '../../../../shared/rich-table';
import { ImportFromJiraDialogComponent } from '../../import-from-jira-dialog.component';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Component({
  selector: 'app-jira-issues-page',
  imports: [
    NgIcon,
    RouterLink,
    RichTableComponent,
    ImportFromJiraDialogComponent,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
  ],
  providers: [provideIcons({ lucideDownload, lucideRefreshCw, lucideSearch })],
  templateUrl: './jira-issues-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0 overflow-y-auto' },
})
export class JiraIssuesPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);
  private readonly jiraService = inject(JiraIntegrationsService);

  /** Initial page bootstrap (table skeleton only — toolbar stays stable). */
  readonly loading = signal(true);
  /** Issue list refresh in progress (spins the Refresh icon). */
  readonly refreshing = signal(false);
  readonly error = signal<string | null>(null);
  readonly issues = signal<JiraIssuePreviewDto[]>([]);
  readonly searchInput = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(20);
  readonly projectCode = signal('');
  readonly siteUrl = signal<string | null>(null);
  readonly settingsLink = computed(() => {
    const code = this.projectCode();
    return code ? APP_PATHS.projectSettings(code) : APP_PATHS.projects;
  });

  readonly jiraImportDialogState = signal<'open' | 'closed'>('closed');

  /** Used by the template to enable toolbar actions after bootstrap. */
  projectId: string | null = null;

  readonly filteredIssues = computed(() => {
    const q = this.searchInput().trim().toLowerCase();
    const all = this.issues();
    if (!q) {
      return all;
    }
    return all.filter((issue) => {
      const haystack = [
        issue.key,
        issue.summary,
        issue.issueType,
        issue.status,
        issue.assigneeDisplayName,
        issue.parentKey,
        issue.localTaskCode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  });

  readonly pagedIssues = computed(() => {
    const rows = this.filteredIssues();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return rows.slice(start, start + size);
  });

  readonly totalItems = computed(() => this.filteredIssues().length);

  readonly tableColumns: RichTableColumn<JiraIssuePreviewDto>[] = [
    {
      key: 'key',
      label: 'Key',
      accessorFn: (row) => row.key,
      render: (row) => this.renderIssueLink(row.key, 'font-mono text-sm font-medium'),
      enableHiding: false,
    },
    {
      key: 'summary',
      label: 'Summary',
      accessorFn: (row) => row.summary,
      render: (row) => `<span class="font-medium">${escapeHtml(row.summary || '—')}</span>`,
      enableHiding: false,
    },
    {
      key: 'issueType',
      label: 'Type',
      render: (row) =>
        `<span class="text-muted-foreground text-sm">${escapeHtml(row.issueType || '—')}</span>`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) =>
        `<span class="text-muted-foreground text-sm">${escapeHtml(row.status || '—')}</span>`,
    },
    {
      key: 'assignee',
      label: 'Assignee',
      render: (row) =>
        `<span class="text-muted-foreground text-sm">${escapeHtml(row.assigneeDisplayName || 'Unassigned')}</span>`,
    },
    {
      key: 'parent',
      label: 'Parent',
      render: (row) =>
        row.parentKey
          ? this.renderIssueLink(row.parentKey, 'font-mono text-muted-foreground text-sm')
          : `<span class="text-muted-foreground text-sm">—</span>`,
    },
    {
      key: 'imported',
      label: 'In Skemex',
      render: (row) =>
        row.alreadyImported
          ? `<span class="text-sm text-emerald-700 dark:text-emerald-300">${escapeHtml(row.localTaskCode || 'Imported')}</span>`
          : `<span class="text-muted-foreground text-sm">—</span>`,
    },
  ];

  ngOnInit(): void {
    void this.load();
  }

  onSearchInput(value: string): void {
    this.searchInput.set(value);
    this.currentPage.set(1);
  }

  onPaginationChange(event: RichTablePaginationChange): void {
    this.currentPage.set(event.pageNumber);
    this.pageSize.set(event.page);
  }

  async refresh(): Promise<void> {
    await this.loadIssues();
  }

  openJiraImportDialog(): void {
    if (!this.projectId) {
      return;
    }
    this.jiraImportDialogState.set('open');
  }

  onJiraImported(didImport: boolean): void {
    if (didImport) {
      void this.loadIssues();
    }
  }

  private async load(): Promise<void> {
    const code = findRouteParam(this.route, 'projectCode');
    this.projectCode.set(code);
    if (!code) {
      this.error.set('Project was not found.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    try {
      const project = await this.projectsService.getByCode(code);
      if (!project?.id) {
        this.error.set('Project was not found.');
        return;
      }
      this.projectId = project.id;
      await this.loadConnection();
      await this.loadIssues({ showRefreshing: false });
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
      this.issues.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadConnection(): Promise<void> {
    if (!this.projectId) {
      return;
    }

    try {
      const connection = await this.jiraService.getConnection(this.projectId);
      const raw = connection?.siteUrl?.trim() || null;
      this.siteUrl.set(raw ? raw.replace(/\/+$/, '') : null);
    } catch {
      this.siteUrl.set(null);
    }
  }

  private async loadIssues(options?: { showRefreshing?: boolean }): Promise<void> {
    if (!this.projectId) {
      return;
    }

    const showRefreshing = options?.showRefreshing !== false;
    if (showRefreshing) {
      this.refreshing.set(true);
    }
    this.error.set(null);
    try {
      const issues = await this.jiraService.listRemoteIssues(this.projectId);
      this.issues.set(issues);
      this.currentPage.set(1);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
      this.issues.set([]);
    } finally {
      if (showRefreshing) {
        this.refreshing.set(false);
      }
    }
  }

  private browseUrl(issueKey: string): string | null {
    const base = this.siteUrl();
    const key = issueKey.trim();
    if (!base || !key) {
      return null;
    }
    return `${base}/browse/${encodeURIComponent(key)}`;
  }

  private renderIssueLink(issueKey: string, className: string): string {
    const key = escapeHtml(issueKey);
    const url = this.browseUrl(issueKey);
    if (!url) {
      return `<span class="${className}">${key}</span>`;
    }
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="${className} text-primary underline-offset-2 hover:underline">${key}</a>`;
  }
}
