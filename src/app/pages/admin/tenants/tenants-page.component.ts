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
import { lucideBuilding2, lucidePlus, lucideSearch } from '@ng-icons/lucide';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { problemDetailMessage } from '../../../http/problem-details';
import type { SaTenantDto } from '../../../models/admin/tenants.models';
import { adminAbsolutePath } from '../../../routing/app-paths';
import { SaTenantsService } from '../../../services/admin/sa-tenants.service';
import {
  RichTableComponent,
  type RichTableColumn,
  type RichTablePaginationChange,
} from '../../../shared/rich-table';
import { TenantsTableActionsCellComponent } from './tenants-table-actions-cell.component';
import { TenantsTableNameCellComponent } from './tenants-table-name-cell.component';
import { TENANTS_TABLE_HOST, type TenantsTableHost } from './tenants-table-host';

function formatTenantDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

@Component({
  selector: 'app-tenants-page',
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
    provideIcons({ lucideSearch, lucidePlus, lucideBuilding2 }),
    { provide: TENANTS_TABLE_HOST, useExisting: TenantsPageComponent },
  ],
  templateUrl: './tenants-page.component.html',
  styleUrl: './tenants-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantsPageComponent implements OnInit, TenantsTableHost {
  private readonly tenantsService = inject(SaTenantsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  readonly loading = signal(true);
  readonly deletingId = signal<string | null>(null);
  readonly listError = signal<string | null>(null);
  readonly tenants = signal<SaTenantDto[]>([]);
  readonly searchInput = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly tenantsNewLink = signal<string[]>([]);

  private pagingEnabled = false;
  private suppressPagingEffect = false;

  readonly columns: RichTableColumn<SaTenantDto>[] = [
    {
      key: 'name',
      label: 'Name',
      component: TenantsTableNameCellComponent,
      accessorFn: (row) => row.name,
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
        `<span class="text-muted-foreground text-sm">${formatTenantDate(row.createdAt)}</span>`,
    },
    {
      key: 'memberCount',
      label: 'Members',
      render: (row) => `<span class="text-sm">${row.memberCount}</span>`,
    },
    {
      key: 'actions',
      label: 'Actions',
      header: '<div class="text-right">Actions</div>',
      component: TenantsTableActionsCellComponent,
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
    this.tenantsNewLink.set(adminAbsolutePath('tenants', 'new'));

    void this.refreshList();

    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentPage.set(1);
        void this.refreshList();
      });
  }

  editLink(tenantId: string): string[] {
    return adminAbsolutePath('tenants', tenantId, 'edit');
  }

  displayName(tenant: SaTenantDto): string {
    return tenant.name.trim() || tenant.email;
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

  async deleteTenant(tenant: SaTenantDto): Promise<void> {
    const name = this.displayName(tenant);
    if (!confirm(`Delete workspace "${name}"? This cannot be undone.`)) {
      return;
    }

    this.deletingId.set(tenant.id);
    this.listError.set(null);
    try {
      await this.tenantsService.delete(tenant.id);
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
      const page = await this.tenantsService.list(
        this.searchInput(),
        this.currentPage(),
        this.pageSize(),
      );
      this.tenants.set(page.items);
      this.totalItems.set(page.totalItems);
      this.suppressPagingEffect = true;
      this.currentPage.set(page.pageNumber);
      this.pageSize.set(page.pageSize);
      this.suppressPagingEffect = false;
      this.pagingEnabled = true;
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
      this.tenants.set([]);
      this.totalItems.set(0);
      this.pagingEnabled = true;
    } finally {
      this.loading.set(false);
    }
  }
}
