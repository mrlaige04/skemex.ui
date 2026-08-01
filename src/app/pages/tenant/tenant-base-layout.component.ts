import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
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
  lucideBot,
  lucideBuilding2,
  lucideCheck,
  lucideChevronsUpDown,
  lucideFolderKanban,
  lucideLayoutDashboard,
  lucideLogOut,
  lucideMail,
  lucidePlus,
  lucideSettings,
  lucideShield,
  lucideUserCircle,
  lucideUsers,
} from '@ng-icons/lucide';
import { filter, merge, of } from 'rxjs';
import { HlmBreadcrumbImports } from 'spartan/breadcrumb';
import { HlmDropdownMenuImports } from 'spartan/dropdown-menu';
import { HlmIconImports } from 'spartan/icon';
import { HlmSidebarImports, HlmSidebarService, provideHlmSidebarConfig } from 'spartan/sidebar';
import { APP_PATHS, adminSectionPath, workspaceSectionPath } from '../../routing/app-paths';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-tenant-base-layout',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NgIcon,
    ...HlmSidebarImports,
    ...HlmBreadcrumbImports,
    ...HlmDropdownMenuImports,
    ...HlmIconImports,
  ],
  providers: [
    provideIcons({
      lucideBot,
      lucideBuilding2,
      lucideLayoutDashboard,
      lucideUsers,
      lucideFolderKanban,
      lucideSettings,
      lucideUserCircle,
      lucideChevronsUpDown,
      lucideLogOut,
      lucideCheck,
      lucidePlus,
      lucideShield,
      lucideMail,
    }),
    provideHlmSidebarConfig({ closeMobileSidebarOnMenuButtonClick: true }),
  ],
  templateUrl: './tenant-base-layout.component.html',
  styleUrl: './tenant-base-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-svh' },
})
export class TenantBaseLayoutComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sidebar = inject(HlmSidebarService);

  readonly breadcrumbPage = signal('');
  /** Hide broken image and show initials again after URL changes. */
  readonly userAvatarLoadFailed = signal(false);

  private readonly resetUserAvatarError = effect(() => {
    this.auth.workspaceContext()?.avatarUrl;
    this.auth.superAdminSession()?.avatarUrl;
    this.userAvatarLoadFailed.set(false);
  });

  /** Desktop: always expanded (including after keyboard shortcut). Mobile: sheet uses openMobile only. */
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
      const label = (child?.snapshot?.data?.['breadcrumb'] as string) ?? '';
      this.breadcrumbPage.set(label);
    };

    merge(of(null), this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => refreshCrumb());
  }

  /** Public profile image URL when the API returned one (local <code>/blobs/...</code> or CDN). */
  userAvatarUrl(): string | null {
    const raw = (
      this.auth.isSuperAdmin()
        ? this.auth.superAdminSession()?.avatarUrl
        : this.auth.workspaceContext()?.avatarUrl
    )?.trim();
    return raw && raw.length > 0 ? raw : null;
  }

  onUserAvatarImageError(): void {
    this.userAvatarLoadFailed.set(true);
  }

  userInitials(): string {
    const sa = this.auth.superAdminSession();
    const ctx = this.auth.workspaceContext();
    const fn = (this.auth.isSuperAdmin() ? sa?.firstName : ctx?.firstName)?.trim() ?? '';
    const ln = (this.auth.isSuperAdmin() ? sa?.lastName : ctx?.lastName)?.trim() ?? '';
    if (fn.length > 0 && ln.length > 0 && fn[0] && ln[0]) {
      return (fn[0] + ln[0]).toUpperCase();
    }
    if (fn.length >= 2) {
      return fn.slice(0, 2).toUpperCase();
    }
    if (fn.length === 1) {
      return fn.toUpperCase();
    }
    const e = (this.auth.isSuperAdmin() ? sa?.email : ctx?.userEmail) ?? '';
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

  /** Display line in the sidebar (name from profile, else email local-part). */
  userDisplayName(): string {
    const sa = this.auth.superAdminSession();
    const ctx = this.auth.workspaceContext();
    const fn = (this.auth.isSuperAdmin() ? sa?.firstName : ctx?.firstName)?.trim() ?? '';
    const ln = (this.auth.isSuperAdmin() ? sa?.lastName : ctx?.lastName)?.trim() ?? '';
    const full = [fn, ln].filter(Boolean).join(' ').trim();
    if (full.length > 0) {
      return full;
    }
    const e = (this.auth.isSuperAdmin() ? sa?.email : ctx?.userEmail) ?? '';
    const local = e.split('@')[0]?.trim() ?? '';
    if (!local) {
      return this.auth.isSuperAdmin() ? 'Super admin' : 'User';
    }
    const chunk = local.split(/[._-]/)[0] ?? local;
    return chunk.length > 0 ? chunk[0].toUpperCase() + chunk.slice(1) : 'User';
  }

  userEmail(): string {
    if (this.auth.isSuperAdmin()) {
      return this.auth.superAdminSession()?.email ?? '';
    }
    return this.auth.workspaceContext()?.userEmail ?? '';
  }

  breadcrumbRootLabel(): string {
    return this.auth.isSuperAdmin()
      ? 'Platform admin'
      : (this.auth.workspaceContext()?.tenantName ?? 'Workspace');
  }

  breadcrumbRootLink(): string[] {
    return this.auth.isSuperAdmin()
      ? adminSectionPath('dashboard')
      : this.tenantSection('dashboard');
  }

  /** Paths under the workspace layout (tenant id is stored, not in the URL). */
  tenantSection(segment: string): string[] {
    if (!this.auth.workspaceContext()?.tenantId) {
      return [APP_PATHS.select];
    }
    return workspaceSectionPath(segment);
  }

  adminSection(segment: string): string[] {
    return adminSectionPath(segment);
  }

  async switchWorkspace(tenantId: string): Promise<void> {
    if (tenantId === this.auth.workspaceContext()?.tenantId) {
      return;
    }
    const leaf = this.route.firstChild?.snapshot.routeConfig?.path ?? 'dashboard';
    try {
      await this.auth.selectTenant(tenantId);
      await this.router.navigate(workspaceSectionPath(leaf));
    } catch {
      /* menu closes; optional: surface toast */
    }
  }

  goCreateCompany(): void {
    void this.router.navigate([APP_PATHS.select], { queryParams: { create: '1' } });
  }

  /** User dropdown: CDK menu can block <code>routerLink</code> on anchors — navigate explicitly. */
  goUserProfile(): void {
    void this.router.navigate(this.tenantSection('profile'));
  }
}
