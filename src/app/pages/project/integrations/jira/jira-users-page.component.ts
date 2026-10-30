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
import { lucideLoaderCircle, lucideRefreshCw, lucideSearch } from '@ng-icons/lucide';
import {
  injectFlexRenderContext,
  type CellContext,
} from '@tanstack/angular-table';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { problemDetailMessage } from '../../../../http/problem-details';
import type { JiraUserDto } from '../../../../models/integrations/jira.models';
import type { ProjectTaskUserDto } from '../../../../models/projects/projects.models';
import { APP_PATHS } from '../../../../routing/app-paths';
import { findRouteParam } from '../../../../routing/find-route-param';
import { JiraIntegrationsService } from '../../../../services/integrations/jira-integrations.service';
import { ProjectsService } from '../../../../services/projects/projects.service';
import {
  RichTableComponent,
  type RichTableColumn,
  type RichTablePaginationChange,
} from '../../../../shared/rich-table';
import { IssuePersonChipComponent } from '../../issue-person-chip.component';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toPersonChipUser(user: JiraUserDto): ProjectTaskUserDto {
  const name = user.displayName?.trim() ?? '';
  const parts = name.split(/\s+/).filter(Boolean);
  return {
    id: user.accountId,
    firstName: parts[0] ?? '',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
    email: user.emailAddress?.trim() ?? '',
    avatarUrl: null,
  };
}

/** Thin table adapter — reuses {@link IssuePersonChipComponent}. */
@Component({
  selector: 'app-jira-users-person-cell',
  imports: [IssuePersonChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-issue-person-chip [user]="person()" />`,
})
export class JiraUsersPersonCellComponent {
  private readonly ctx = injectFlexRenderContext<CellContext<JiraUserDto, unknown>>();
  readonly person = computed(() => toPersonChipUser(this.ctx.row.original));
}

@Component({
  selector: 'app-jira-users-page',
  imports: [
    NgIcon,
    RouterLink,
    RichTableComponent,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
  ],
  providers: [provideIcons({ lucideLoaderCircle, lucideRefreshCw, lucideSearch })],
  templateUrl: './jira-users-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0 overflow-y-auto' },
})
export class JiraUsersPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);
  private readonly jiraService = inject(JiraIntegrationsService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly users = signal<JiraUserDto[]>([]);
  readonly searchInput = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(20);
  readonly projectCode = signal('');
  readonly settingsLink = computed(() => {
    const code = this.projectCode();
    return code ? APP_PATHS.projectSettings(code) : APP_PATHS.projects;
  });

  private projectId: string | null = null;

  readonly filteredUsers = computed(() => {
    const q = this.searchInput().trim().toLowerCase();
    const all = this.users();
    if (!q) {
      return all;
    }
    return all.filter((user) => {
      const haystack = [user.displayName, user.emailAddress, user.accountId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  });

  readonly pagedUsers = computed(() => {
    const rows = this.filteredUsers();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return rows.slice(start, start + size);
  });

  readonly totalItems = computed(() => this.filteredUsers().length);

  readonly tableColumns: RichTableColumn<JiraUserDto>[] = [
    {
      key: 'displayName',
      label: 'Name',
      accessorFn: (row) => row.displayName,
      component: JiraUsersPersonCellComponent,
      enableHiding: false,
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) =>
        `<span class="text-muted-foreground text-sm">${escapeHtml(row.emailAddress || '—')}</span>`,
    },
    {
      key: 'accountId',
      label: 'Account ID',
      render: (row) =>
        `<span class="font-mono text-muted-foreground text-xs">${escapeHtml(row.accountId)}</span>`,
    },
    {
      key: 'active',
      label: 'Status',
      render: (row) =>
        row.active
          ? `<span class="text-sm text-emerald-700 dark:text-emerald-300">Active</span>`
          : `<span class="text-muted-foreground text-sm">Inactive</span>`,
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
    await this.loadUsers();
  }

  private async load(): Promise<void> {
    const code = findRouteParam(this.route, 'projectCode');
    this.projectCode.set(code);
    if (!code) {
      this.error.set('Project was not found.');
      this.loading.set(false);
      return;
    }

    try {
      const project = await this.projectsService.getByCode(code);
      if (!project?.id) {
        this.error.set('Project was not found.');
        this.loading.set(false);
        return;
      }
      this.projectId = project.id;
      await this.loadUsers();
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
      this.loading.set(false);
    }
  }

  private async loadUsers(): Promise<void> {
    if (!this.projectId) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    try {
      const users = await this.jiraService.listRemoteUsers(this.projectId);
      this.users.set(users);
      this.currentPage.set(1);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
      this.users.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
