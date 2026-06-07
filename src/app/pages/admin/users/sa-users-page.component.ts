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
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch, lucideUserPlus } from '@ng-icons/lucide';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { problemDetailMessage } from '../../../http/problem-details';
import type { SaUserDto } from '../../../models/admin/users.models';
import { adminAbsolutePath } from '../../../routing/app-paths';
import { SaUsersService } from '../../../services/admin/sa-users.service';
import {
  RichTableComponent,
  type RichTableColumn,
  type RichTablePaginationChange,
} from '../../../shared/rich-table';
import { SaUsersTableActionsCellComponent } from './sa-users-table-actions-cell.component';
import { SaUsersTableNameCellComponent } from './sa-users-table-name-cell.component';
import { SA_USERS_TABLE_HOST, type SaUsersTableHost } from './sa-users-table-host';

function formatUserDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

@Component({
  selector: 'app-sa-users-page',
  imports: [
    RouterLink,
    NgIcon,
    RichTableComponent,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
  ],
  providers: [
    provideIcons({ lucideSearch, lucideUserPlus }),
    { provide: SA_USERS_TABLE_HOST, useExisting: SaUsersPageComponent },
  ],
  templateUrl: './sa-users-page.component.html',
  styleUrl: './sa-users-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaUsersPageComponent implements OnInit, SaUsersTableHost {
  private readonly usersService = inject(SaUsersService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  readonly loading = signal(true);
  readonly deletingId = signal<string | null>(null);
  readonly listError = signal<string | null>(null);
  readonly users = signal<SaUserDto[]>([]);
  readonly searchInput = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly usersNewLink = signal<string[]>([]);

  private pagingEnabled = false;
  private suppressPagingEffect = false;

  readonly columns: RichTableColumn<SaUserDto>[] = [
    {
      key: 'name',
      label: 'Name',
      component: SaUsersTableNameCellComponent,
      accessorFn: (row) => `${row.firstName} ${row.lastName}`.trim(),
      enableHiding: false,
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) => `<span class="text-muted-foreground text-sm">${row.email}</span>`,
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (row) =>
        `<span class="text-muted-foreground text-sm">${formatUserDate(row.createdAt)}</span>`,
    },
    {
      key: 'workspaceCount',
      label: 'Workspaces',
      render: (row) => `<span class="text-sm">${row.workspaceCount}</span>`,
    },
    {
      key: 'actions',
      label: 'Actions',
      header: '<div class="text-right">Actions</div>',
      component: SaUsersTableActionsCellComponent,
      enableHiding: false,
    },
  ];

  constructor() {
    effect(() => {
      this.currentPage();
      this.pageSize();
      if (!this.pagingEnabled || this.suppressPagingEffect) {
        return;
      }
      void this.refreshList();
    });
  }

  ngOnInit(): void {
    this.usersNewLink.set(adminAbsolutePath('users', 'new'));
    void this.refreshList();

    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentPage.set(1);
        void this.refreshList();
      });
  }

  editLink(userId: string): string[] {
    return adminAbsolutePath('users', userId, 'edit');
  }

  fullName(user: SaUserDto): string {
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

  async deleteUser(user: SaUserDto): Promise<void> {
    const name = this.fullName(user) || user.email;
    if (!confirm(`Delete user ${name}? This cannot be undone.`)) {
      return;
    }

    this.deletingId.set(user.id);
    this.listError.set(null);
    try {
      await this.usersService.delete(user.id);
      await this.refreshList();
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.deletingId.set(null);
    }
  }

  private async refreshList(): Promise<void> {
    this.loading.set(true);
    this.listError.set(null);
    try {
      const page = await this.usersService.list(
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
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
      this.users.set([]);
      this.totalItems.set(0);
      this.pagingEnabled = true;
    } finally {
      this.loading.set(false);
    }
  }
}
