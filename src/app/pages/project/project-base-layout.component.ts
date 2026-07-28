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
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideChevronsUpDown,
  lucideCircleAlert,
  lucideFileText,
  lucideFolderKanban,
  lucideKanbanSquare,
  lucideList,
  lucideLogOut,
  lucideSettings,
  lucideUserCircle,
} from '@ng-icons/lucide';
import { filter, merge, of } from 'rxjs';
import { HlmBreadcrumbImports } from 'spartan/breadcrumb';
import { HlmButtonImports } from 'spartan/button';
import { HlmDropdownMenuImports } from 'spartan/dropdown-menu';
import { HlmIconImports } from 'spartan/icon';
import { HlmSidebarImports, HlmSidebarService, provideHlmSidebarConfig } from 'spartan/sidebar';
import type { ProjectDto } from '../../models/projects/projects.models';
import { APP_PATHS, projectSectionPath } from '../../routing/app-paths';
import { AiChatService } from '../../services/ai-chat/ai-chat.service';
import { AuthService } from '../../services/auth/auth.service';
import { ProjectsService } from '../../services/projects/projects.service';
import { AiChatPanelComponent } from '../../shared/ai-chat/ai-chat-panel.component';

@Component({
  selector: 'app-project-base-layout',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NgIcon,
    AiChatPanelComponent,
    ...HlmSidebarImports,
    ...HlmBreadcrumbImports,
    ...HlmButtonImports,
    ...HlmDropdownMenuImports,
    ...HlmIconImports,
  ],
  providers: [
    provideIcons({
      lucideArrowLeft,
      lucideChevronsUpDown,
      lucideCircleAlert,
      lucideFileText,
      lucideFolderKanban,
      lucideKanbanSquare,
      lucideList,
      lucideLogOut,
      lucideSettings,
      lucideUserCircle,
    }),
    provideHlmSidebarConfig({ closeMobileSidebarOnMenuButtonClick: true }),
  ],
  templateUrl: './project-base-layout.component.html',
  styleUrl: './project-base-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-svh' },
})
export class ProjectBaseLayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly aiChat = inject(AiChatService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sidebar = inject(HlmSidebarService);
  private readonly projectsService = inject(ProjectsService);
  readonly project = signal<ProjectDto | null>(null);
  readonly projectCode = signal('');
  readonly breadcrumbPage = signal('');
  readonly userAvatarLoadFailed = signal(false);
  readonly projectLogoLoadFailed = signal(false);
  private readonly resetUserAvatarError = effect(() => {
    this.auth.workspaceContext()?.avatarUrl;
    this.userAvatarLoadFailed.set(false);
  });
  private readonly resetProjectLogoError = effect(() => {
    this.project()?.logoUrl;
    this.projectLogoLoadFailed.set(false);
  });
  private readonly keepSidebarExpandedOnDesktop = effect(() => {
    if (!this.sidebar.isMobile() && !this.sidebar.open()) {
      this.sidebar.setOpen(true);
    }
  });
  constructor() {
    const refreshCrumb = (): void => {
      let child = this.route.firstChild;
      while (child?.firstChild) {
        child = child.firstChild;
      }
      const issueCode = child?.snapshot?.paramMap.get('issueCode')?.trim();
      if (issueCode) {
        this.breadcrumbPage.set(issueCode.toUpperCase());
        return;
      }
      const label = (child?.snapshot?.data?.['breadcrumb'] as string) ?? '';
      this.breadcrumbPage.set(label);
    };
    merge(
      of(null),
      this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => refreshCrumb());
  }
  ngOnInit(): void {
    void this.loadProject();
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      void this.loadProject();
    });
  }
  projectSection(segment: string): string[] {
    const code = this.projectCode();
    return code ? projectSectionPath(code, segment) : [APP_PATHS.projects];
  }
  goBackToWorkspace(): void {
    void this.router.navigate([APP_PATHS.projects]);
  }
  userAvatarUrl(): string | null {
    const raw = this.auth.workspaceContext()?.avatarUrl?.trim();
    return raw && raw.length > 0 ? raw : null;
  }
  onUserAvatarImageError(): void {
    this.userAvatarLoadFailed.set(true);
  }
  onProjectLogoError(): void {
    this.projectLogoLoadFailed.set(true);
  }
  userInitials(): string {
    const ctx = this.auth.workspaceContext();
    const fn = ctx?.firstName?.trim() ?? '';
    const ln = ctx?.lastName?.trim() ?? '';
    if (fn.length > 0 && ln.length > 0 && fn[0] && ln[0]) {
      return (fn[0] + ln[0]).toUpperCase();
    }
    if (fn.length >= 2) {
      return fn.slice(0, 2).toUpperCase();
    }
    if (fn.length === 1) {
      return fn.toUpperCase();
    }
    const e = ctx?.userEmail ?? '';
    const local = e.split('@')[0] ?? '';
    if (!local) {
      return '?';
    }
    const parts = local.split(/[.\-_]/).filter(Boolean);
    if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return local.slice(0, 2).toUpperCase();
  }
  userDisplayName(): string {
    const ctx = this.auth.workspaceContext();
    const fn = ctx?.firstName?.trim() ?? '';
    const ln = ctx?.lastName?.trim() ?? '';
    const full = [fn, ln].filter(Boolean).join(' ').trim();
    if (full.length > 0) {
      return full;
    }
    const e = ctx?.userEmail ?? '';
    const local = e.split('@')[0]?.trim() ?? '';
    if (!local) {
      return 'User';
    }
    const chunk = local.split(/[._-]/)[0] ?? local;
    return chunk.length > 0 ? chunk[0].toUpperCase() + chunk.slice(1) : 'User';
  }
  userEmail(): string {
    return this.auth.workspaceContext()?.userEmail ?? '';
  }
  goUserProfile(): void {
    void this.router.navigate([APP_PATHS.profile]);
  }
  private async loadProject(): Promise<void> {
    const code = this.route.snapshot.paramMap.get('projectCode')?.trim() ?? '';
    this.projectCode.set(code);
    if (!code) {
      this.project.set(null);
      this.aiChat.setProjectContext(null, null);
      return;
    }
    try {
      const loaded = await this.projectsService.getByCode(code);
      this.project.set(loaded);
      this.aiChat.setProjectContext(loaded?.id ?? null, loaded?.code ?? code);
      if (loaded && loaded.code !== code) {
        void this.router.navigateByUrl(`/${loaded.code}`, { replaceUrl: true });
      }
    } catch {
      this.project.set(null);
      this.aiChat.setProjectContext(null, null);
    }
  }
}
