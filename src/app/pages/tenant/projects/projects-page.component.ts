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
import { lucideFolderKanban, lucidePlus, lucideSearch } from '@ng-icons/lucide';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmNumberedPagination } from 'spartan/pagination';
import { problemDetailMessage } from '../../../http/problem-details';
import type { ProjectDto } from '../../../models/projects/projects.models';
import { APP_PATHS } from '../../../routing/app-paths';
import { ProjectsService } from '../../../services/projects/projects.service';

@Component({
  selector: 'app-projects-page',
  imports: [
    RouterLink,
    NgIcon,
    HlmNumberedPagination,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
  ],
  providers: [provideIcons({ lucideFolderKanban, lucidePlus, lucideSearch })],
  templateUrl: './projects-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsPageComponent implements OnInit {
  private readonly projectsService = inject(ProjectsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  readonly loading = signal(true);
  readonly listError = signal<string | null>(null);
  readonly projects = signal<ProjectDto[]>([]);
  readonly searchInput = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly projectsNewLink = signal<string[]>([]);
  private readonly failedLogoIds = signal<Set<string>>(new Set());

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
    this.projectsNewLink.set([APP_PATHS.projectsNew]);
    void this.refreshList();

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

  onCurrentPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onItemsPerPageChange(size: number): void {
    this.currentPage.set(1);
    this.pageSize.set(size);
  }

  logoFailed(projectId: string): boolean {
    return this.failedLogoIds().has(projectId);
  }

  onLogoError(projectId: string): void {
    this.failedLogoIds.update((ids) => {
      const next = new Set(ids);
      next.add(projectId);
      return next;
    });
  }

  projectLink(code: string): string[] {
    return [APP_PATHS.project(code)];
  }

  private async refreshList(): Promise<void> {
    this.loading.set(true);
    this.listError.set(null);
    try {
      const page = await this.projectsService.list(
        this.searchInput(),
        this.currentPage(),
        this.pageSize(),
      );
      this.failedLogoIds.set(new Set());
      this.projects.set(page.items);
      this.totalItems.set(page.totalItems);
      this.suppressPagingEffect = true;
      this.currentPage.set(page.pageNumber);
      this.pageSize.set(page.pageSize);
      this.suppressPagingEffect = false;
      this.pagingEnabled = true;
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
      this.projects.set([]);
      this.totalItems.set(0);
      this.pagingEnabled = true;
    } finally {
      this.loading.set(false);
    }
  }
}
