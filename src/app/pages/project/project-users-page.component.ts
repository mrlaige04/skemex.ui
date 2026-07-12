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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { problemDetailMessage } from '../../http/problem-details';
import type { ProjectUserDto } from '../../models/projects/projects.models';
import { ProjectsService } from '../../services/projects/projects.service';
import {
  RichTableComponent,
  type RichTableColumn,
  type RichTablePaginationChange,
} from '../../shared/rich-table';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fullName(user: ProjectUserDto): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

function initials(user: ProjectUserDto): string {
  const fromName = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.trim();
  if (fromName) {
    return fromName.toUpperCase();
  }
  return (user.email[0] ?? '?').toUpperCase();
}

function renderNameCell(user: ProjectUserDto): string {
  const name = escapeHtml(fullName(user) || user.email);
  const letter = escapeHtml(initials(user));
  return `
    <div class="flex items-center gap-2.5">
      <div class="border-border bg-muted/40 text-muted-foreground relative size-8 shrink-0 overflow-hidden rounded-md border text-xs font-semibold">
        <span class="flex size-full items-center justify-center" aria-hidden="true">${letter}</span>
      </div>
      <span class="font-medium">${name}</span>
    </div>
  `;
}

@Component({
  selector: 'app-project-users-page',
  imports: [
    NgIcon,
    RichTableComponent,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
  ],
  providers: [provideIcons({ lucideSearch })],
  templateUrl: './project-users-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0 overflow-y-auto' },
})
export class ProjectUsersPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  readonly loading = signal(true);
  readonly listError = signal<string | null>(null);
  readonly projectName = signal('');
  readonly users = signal<ProjectUserDto[]>([]);
  readonly searchInput = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);

  private projectId: string | null = null;
  private pagingEnabled = false;
  private suppressPagingEffect = false;

  readonly columns: RichTableColumn<ProjectUserDto>[] = [
    {
      key: 'name',
      label: 'Name',
      accessorFn: (row) => fullName(row) || row.email,
      render: (row) => renderNameCell(row),
      enableHiding: false,
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) =>
        `<span class="text-muted-foreground text-sm">${escapeHtml(row.email)}</span>`,
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
        this.projectName.set('');
        this.projectId = null;
        return;
      }

      this.projectName.set(project.name);
      this.projectId = project.id;
      await this.refreshList();
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
      this.users.set([]);
      this.totalItems.set(0);
      this.projectName.set('');
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
