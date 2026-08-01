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
import { ActivatedRoute } from '@angular/router';
import { BrnDialogContent } from '@spartan-ng/brain/dialog';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch, lucideUserPlus } from '@ng-icons/lucide';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmDialogImports } from 'spartan/dialog';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { problemDetailMessage, isTransientHttpFailure } from '../../http/problem-details';
import type { ProjectUserDto } from '../../models/projects/projects.models';
import type { TenantUserDto } from '../../models/users/users.models';
import { ProjectsService } from '../../services/projects/projects.service';
import { UsersService } from '../../services/users/users.service';
import { ConfirmAlertDialogComponent } from '../../shared/confirm-alert-dialog/confirm-alert-dialog.component';
import {
  RichTableComponent,
  type RichTableColumn,
  type RichTablePaginationChange,
} from '../../shared/rich-table';
import { ProjectUsersTableActionsCellComponent } from './project-users-table-actions-cell.component';
import { ProjectUsersNameCellComponent } from './project-users-name-cell.component';
import {
  PROJECT_USERS_TABLE_HOST,
  type ProjectUsersTableHost,
} from './project-users-table-host';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isActiveTenantUser(user: TenantUserDto): boolean {
  const status = user.status;
  return status === 1 || status === 'Active' || status === 'active' || status == null;
}

@Component({
  selector: 'app-project-settings-users-tab',
  imports: [
    BrnDialogContent,
    NgIcon,
    RichTableComponent,
    ConfirmAlertDialogComponent,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmDialogImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
  ],
  providers: [
    provideIcons({ lucideSearch, lucideUserPlus }),
    { provide: PROJECT_USERS_TABLE_HOST, useExisting: ProjectSettingsUsersTabComponent },
  ],
  templateUrl: './project-settings-users-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectSettingsUsersTabComponent implements OnInit, ProjectUsersTableHost {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);
  private readonly usersService = inject(UsersService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();
  private readonly candidateSearch$ = new Subject<string>();

  readonly loading = signal(true);
  readonly listError = signal<string | null>(null);
  readonly users = signal<ProjectUserDto[]>([]);
  readonly searchInput = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly deletingId = signal<string | null>(null);

  readonly addDialogState = signal<'open' | 'closed'>('closed');
  readonly confirmDialogState = signal<'open' | 'closed'>('closed');
  readonly pendingRemoveUser = signal<ProjectUserDto | null>(null);
  readonly candidateLoading = signal(false);
  readonly candidateError = signal<string | null>(null);
  readonly candidateSearch = signal('');
  readonly candidates = signal<TenantUserDto[]>([]);
  readonly addingId = signal<string | null>(null);

  private projectId: string | null = null;
  private memberIds = new Set<string>();
  private pagingEnabled = false;
  private suppressPagingEffect = false;

  readonly columns: RichTableColumn<ProjectUserDto>[] = [
    {
      key: 'name',
      label: 'Name',
      accessorFn: (row) => this.fullName(row) || row.email,
      component: ProjectUsersNameCellComponent,
      enableHiding: false,
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) =>
        `<span class="text-muted-foreground text-sm">${escapeHtml(row.email)}</span>`,
    },
    {
      key: 'actions',
      label: 'Actions',
      header: '<div class="text-right">Actions</div>',
      component: ProjectUsersTableActionsCellComponent,
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

    this.candidateSearch$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.refreshCandidates();
      });
  }

  fullName(user: ProjectUserDto | TenantUserDto): string {
    return `${user.firstName} ${user.lastName}`.trim();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchInput.set(value);
    this.search$.next(value);
  }

  onPaginationChange(change: RichTablePaginationChange): void {
    this.currentPage.set(change.pageNumber);
    this.pageSize.set(change.page);
  }

  onAddDialogStateChanged(state: 'open' | 'closed'): void {
    this.addDialogState.set(state);
    if (state === 'open') {
      this.candidateError.set(null);
      this.candidateSearch.set('');
      void this.refreshCandidates();
      return;
    }

    this.candidates.set([]);
    this.candidateError.set(null);
    this.candidateSearch.set('');
    this.addingId.set(null);
  }

  onCandidateSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.candidateSearch.set(value);
    this.candidateSearch$.next(value);
  }

  async addCandidate(user: TenantUserDto): Promise<void> {
    if (!this.projectId || this.addingId()) {
      return;
    }

    this.addingId.set(user.id);
    this.candidateError.set(null);
    try {
      await this.projectsService.addUser(this.projectId, user.id);
      this.addDialogState.set('closed');
      await this.refreshList();
    } catch (err) {
      this.candidateError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.addingId.set(null);
    }
  }

  removeUser(user: ProjectUserDto): void {
    this.pendingRemoveUser.set(user);
    this.confirmDialogState.set('open');
  }

  async confirmRemoveUser(): Promise<void> {
    const user = this.pendingRemoveUser();
    this.pendingRemoveUser.set(null);
    if (!user || !this.projectId) {
      return;
    }

    this.deletingId.set(user.id);
    this.listError.set(null);
    try {
      await this.projectsService.removeUser(this.projectId, user.id);
      await this.refreshList();
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.deletingId.set(null);
    }
  }

  pendingRemoveUserName(): string {
    const user = this.pendingRemoveUser();
    if (!user) {
      return '';
    }
    return this.fullName(user) || user.email;
  }

  private async loadProject(): Promise<void> {
    const code = this.route.parent?.snapshot.paramMap.get('projectCode')?.trim() ?? '';
    if (!code) {
      this.loading.set(false);
      this.listError.set('Project was not found.');
      this.users.set([]);
      this.totalItems.set(0);
      return;
    }

    this.loading.set(true);
    this.listError.set(null);
    try {
      const project = await this.projectsService.getByCode(code);
      if (!project) {
        this.listError.set('Project was not found.');
        this.users.set([]);
        this.totalItems.set(0);
        this.projectId = null;
        return;
      }

      this.projectId = project.id;
      await this.refreshList();
    } catch (err) {
      if (!isTransientHttpFailure(err)) {
        this.listError.set(problemDetailMessage(err as HttpErrorResponse));
      }
      this.users.set([]);
      this.totalItems.set(0);
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
      const page = await this.projectsService.listUsers(
        this.projectId,
        this.searchInput(),
        this.currentPage(),
        this.pageSize(),
      );
      this.users.set(page.items);
      this.totalItems.set(page.totalItems);
      this.suppressPagingEffect = true;
      this.currentPage.set(page.pageNumber);
      this.pageSize.set(page.pageSize);
      this.suppressPagingEffect = false;
      this.pagingEnabled = true;
      await this.refreshMemberIds();
    } catch (err) {
      if (!isTransientHttpFailure(err)) {
        this.listError.set(problemDetailMessage(err as HttpErrorResponse));
      }
      this.users.set([]);
      this.totalItems.set(0);
      this.pagingEnabled = true;
    } finally {
      this.loading.set(false);
    }
  }

  private async refreshMemberIds(): Promise<void> {
    if (!this.projectId) {
      this.memberIds = new Set();
      return;
    }

    try {
      const page = await this.projectsService.listUsers(this.projectId, undefined, 1, 100);
      this.memberIds = new Set(page.items.map((user) => user.id));
    } catch {
      this.memberIds = new Set(this.users().map((user) => user.id));
    }
  }

  private async refreshCandidates(): Promise<void> {
    this.candidateLoading.set(true);
    this.candidateError.set(null);
    try {
      const page = await this.usersService.list(this.candidateSearch(), 1, 50);
      this.candidates.set(
        page.items.filter((user) => isActiveTenantUser(user) && !this.memberIds.has(user.id)),
      );
    } catch (err) {
      this.candidateError.set(problemDetailMessage(err as HttpErrorResponse));
      this.candidates.set([]);
    } finally {
      this.candidateLoading.set(false);
    }
  }
}
