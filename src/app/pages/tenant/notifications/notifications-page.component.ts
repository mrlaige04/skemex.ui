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
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheckCheck, lucideSearch } from '@ng-icons/lucide';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmLabelImports } from 'spartan/label';
import { HlmSelectImports } from 'spartan/select';
import { problemDetailMessage } from '../../../http/problem-details';
import type {
  NotificationDto,
  NotificationSeverity,
  NotificationSort,
} from '../../../models/notifications/notifications.models';
import { NotificationsService } from '../../../services/notifications/notifications.service';
import { severityLabel } from '../../../shared/notifications/notification-severity.util';
import {
  formatNotificationDateTime,
  formatRelativeTime,
} from '../../../shared/notifications/relative-time.util';
import {
  RichTableComponent,
  type RichTableColumn,
  type RichTablePaginationChange,
} from '../../../shared/rich-table';
import { NotificationsActionsCellComponent } from './notifications-actions-cell.component';
import {
  NOTIFICATIONS_TABLE_HOST,
  type NotificationsTableHost,
} from './notifications-table-host';
import { NotificationsTitleCellComponent } from './notifications-title-cell.component';

const ALL_VALUE = '__all__';

const SEVERITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: ALL_VALUE, label: 'All severities' },
  { value: 'Info', label: 'Info' },
  { value: 'Success', label: 'Success' },
  { value: 'Warning', label: 'Warning' },
  { value: 'Error', label: 'Error' },
];

const READ_OPTIONS: Array<{ value: string; label: string }> = [
  { value: ALL_VALUE, label: 'All' },
  { value: 'false', label: 'Unread' },
  { value: 'true', label: 'Read' },
];

const SORT_OPTIONS: Array<{ value: NotificationSort; label: string }> = [
  { value: 'createdAtDesc', label: 'Newest first' },
  { value: 'createdAtAsc', label: 'Oldest first' },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function severityDotColor(severity: string): string {
  switch (severity) {
    case 'Success':
      return '#16a34a';
    case 'Warning':
      return '#d97706';
    case 'Error':
      return '#dc2626';
    case 'Info':
    default:
      return '#3b82f6';
  }
}

@Component({
  selector: 'app-notifications-page',
  imports: [
    NgIcon,
    RichTableComponent,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
  ],
  providers: [
    provideIcons({ lucideCheckCheck, lucideSearch }),
    { provide: NOTIFICATIONS_TABLE_HOST, useExisting: NotificationsPageComponent },
  ],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPageComponent implements OnInit, NotificationsTableHost {
  private readonly notificationsService = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  readonly loading = signal(true);
  readonly markingAll = signal(false);
  readonly markingId = signal<string | null>(null);
  readonly listError = signal<string | null>(null);
  readonly items = signal<NotificationDto[]>([]);

  readonly searchInput = signal('');
  readonly severityFilter = signal(ALL_VALUE);
  readonly readFilter = signal(ALL_VALUE);
  readonly sort = signal<NotificationSort>('createdAtDesc');
  readonly currentPage = signal(1);
  readonly pageSize = signal(20);
  readonly totalItems = signal(0);

  readonly allValue = ALL_VALUE;
  readonly severityOptions = SEVERITY_OPTIONS;
  readonly readOptions = READ_OPTIONS;
  readonly sortOptions = SORT_OPTIONS;

  readonly columns: RichTableColumn<NotificationDto>[] = [
    {
      key: 'severity',
      label: 'Severity',
      header: '<span class="sr-only">Severity</span>',
      render: (row) =>
        `<span class="inline-block size-2 rounded-full" style="background:${severityDotColor(row.severity)}" title="${escapeHtml(severityLabel(row.severity))}" aria-hidden="true"></span>`,
      enableHiding: false,
    },
    {
      key: 'title',
      label: 'Notification',
      component: NotificationsTitleCellComponent,
      accessorFn: (row) => row.title,
      enableHiding: false,
    },
    {
      key: 'severityLabel',
      label: 'Type',
      render: (row) =>
        `<span class="text-muted-foreground text-sm">${escapeHtml(severityLabel(row.severity))}</span>`,
    },
    {
      key: 'createdAt',
      label: 'When',
      render: (row) =>
        `<span class="text-muted-foreground text-sm" title="${escapeHtml(formatNotificationDateTime(row.createdAt))}">${escapeHtml(formatRelativeTime(row.createdAt))}</span>`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) =>
        row.isRead
          ? `<span class="text-muted-foreground text-sm">Read</span>`
          : `<span class="text-sm font-medium">Unread</span>`,
    },
    {
      key: 'actions',
      label: 'Actions',
      header: '<div class="text-right">Actions</div>',
      component: NotificationsActionsCellComponent,
      enableHiding: false,
    },
  ];

  private pagingEnabled = false;
  private suppressPagingEffect = false;

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
    void this.refreshList();
    void this.notificationsService.refreshUnreadCount().catch(() => undefined);

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

  onSeverityFilterChange(value: unknown): void {
    this.severityFilter.set(typeof value === 'string' ? value : ALL_VALUE);
    this.currentPage.set(1);
    void this.refreshList();
  }

  onReadFilterChange(value: unknown): void {
    this.readFilter.set(typeof value === 'string' ? value : ALL_VALUE);
    this.currentPage.set(1);
    void this.refreshList();
  }

  onSortChange(value: unknown): void {
    const next = typeof value === 'string' ? value : 'createdAtDesc';
    this.sort.set(
      (SORT_OPTIONS.some((option) => option.value === next) ? next : 'createdAtDesc') as NotificationSort,
    );
    this.currentPage.set(1);
    void this.refreshList();
  }

  onPaginationChange(change: RichTablePaginationChange): void {
    this.currentPage.set(change.pageNumber);
    this.pageSize.set(change.page);
  }

  severityLabelFn = (value: unknown): string => {
    const option = SEVERITY_OPTIONS.find((entry) => entry.value === value);
    return option?.label ?? 'All severities';
  };

  readLabelFn = (value: unknown): string => {
    const option = READ_OPTIONS.find((entry) => entry.value === value);
    return option?.label ?? 'All';
  };

  sortLabelFn = (value: unknown): string => {
    const option = SORT_OPTIONS.find((entry) => entry.value === value);
    return option?.label ?? 'Newest first';
  };

  async markRead(item: NotificationDto): Promise<void> {
    if (item.isRead) {
      return;
    }
    this.markingId.set(item.id);
    this.listError.set(null);
    try {
      const updated = await this.notificationsService.markRead(item.id);
      this.items.update((rows) => rows.map((row) => (row.id === item.id ? updated : row)));
      const count = this.notificationsService.unreadCount();
      this.notificationsService.unreadCount.set(Math.max(0, count - 1));
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.markingId.set(null);
    }
  }

  async markAllRead(): Promise<void> {
    this.markingAll.set(true);
    this.listError.set(null);
    try {
      await this.notificationsService.markAllRead();
      this.notificationsService.unreadCount.set(0);
      await this.refreshList();
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.markingAll.set(false);
    }
  }

  async openItem(item: NotificationDto): Promise<void> {
    await this.markRead(item);
    const href = item.href?.trim();
    if (href) {
      await this.router.navigateByUrl(href.startsWith('/') ? href : `/${href}`);
    }
  }

  private async refreshList(): Promise<void> {
    this.loading.set(true);
    this.listError.set(null);
    try {
      const severity =
        this.severityFilter() === ALL_VALUE
          ? undefined
          : (this.severityFilter() as NotificationSeverity);
      const readRaw = this.readFilter();
      const isRead = readRaw === ALL_VALUE ? undefined : readRaw === 'true';

      const page = await this.notificationsService.list({
        search: this.searchInput(),
        severity,
        isRead,
        sort: this.sort(),
        page: this.currentPage(),
        pageSize: this.pageSize(),
      });
      this.items.set(page.items);
      this.totalItems.set(page.totalItems);
      this.suppressPagingEffect = true;
      this.currentPage.set(page.pageNumber);
      this.pageSize.set(page.pageSize);
      this.suppressPagingEffect = false;
      this.pagingEnabled = true;
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
      this.items.set([]);
      this.totalItems.set(0);
      this.pagingEnabled = true;
    } finally {
      this.loading.set(false);
    }
  }
}
