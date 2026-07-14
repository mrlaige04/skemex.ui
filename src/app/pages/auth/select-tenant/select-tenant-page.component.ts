import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BrnDialogContent } from '@spartan-ng/brain/dialog';
import { email, FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBuilding2, lucideChevronRight, lucidePlus, lucideSparkles } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmDialogImports } from 'spartan/dialog';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmItemImports } from 'spartan/item';
import { HlmLabelImports } from 'spartan/label';
import { APP_PATHS } from '../../../routing/app-paths';
import { problemDetailMessage } from '../../../http/problem-details';
import type { CurrentUserResponse } from '../../../models/auth/auth.models';
import { AuthService } from '../../../services/auth/auth.service';
import { AuthRefreshService } from '../../../services/auth/auth-refresh.service';

@Component({
  selector: 'app-select-tenant-page',
  imports: [
    BrnDialogContent,
    FormField,
    NgIcon,
    ...HlmButtonImports,
    ...HlmDialogImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
    ...HlmItemImports,
    ...HlmLabelImports,
  ],
  providers: [provideIcons({ lucideBuilding2, lucideChevronRight, lucidePlus, lucideSparkles })],
  templateUrl: './select-tenant-page.component.html',
  styleUrl: './select-tenant-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectTenantPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly refresh = inject(AuthRefreshService);

  readonly user = signal<CurrentUserResponse | null>(null);
  readonly loading = signal(false);
  readonly selectingId = signal<string | null>(null);
  readonly selectError = signal<string | null>(null);
  readonly creating = signal(false);

  /** Controlled dialog state so we can open “New company” from `?create=1` (sidebar). */
  readonly createDialogState = signal<'open' | 'closed'>('closed');

  private readonly createModel = signal({ name: '', email: '' });
  readonly createForm = form(this.createModel, (f) => {
    required(f.name);
    maxLength(f.name, 256);
    required(f.email);
    email(f.email);
    maxLength(f.email, 256);
  });

  async ngOnInit(): Promise<void> {
    if (!(await this.refresh.ensureValidAccessToken())) {
      void this.router.navigate(['/auth', 'login']);
      return;
    }

    this.auth.syncSuperAdminFromToken();
    if (this.auth.isSuperAdmin()) {
      void this.router.navigate([APP_PATHS.adminDashboard]);
      return;
    }

    const wantsCreate = this.route.snapshot.queryParamMap.get('create') === '1';
    const ws = this.auth.workspaceContext();

    if (this.auth.accessToken() && ws && !wantsCreate) {
      void this.router.navigate([APP_PATHS.dashboard]);
      return;
    }

    this.loading.set(true);
    try {
      const session = await this.auth.refreshSessionState();

      if (session.isSuperAdmin) {
        this.auth.establishSuperAdminSession(session);
        void this.router.navigate([APP_PATHS.adminDashboard]);
        return;
      }

      this.user.set(session);
      this.createModel.set({ name: '', email: session.email });

      if (wantsCreate) {
        this.stripCreateQueryParam();
        queueMicrotask(() => this.createDialogState.set('open'));
      }
    } catch (err) {
      // Session API failed after a valid (or freshly refreshed) token — only logout on auth errors.
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        await this.auth.logout();
        return;
      }
      this.selectError.set(
        err instanceof HttpErrorResponse ? problemDetailMessage(err) : 'Could not load workspaces.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  onCreateDialogStateChanged(state: 'open' | 'closed'): void {
    this.createDialogState.set(state);
  }

  onCreateDialogClosed(): void {
    this.createDialogState.set('closed');
    const u = this.user();
    this.createModel.set({ name: '', email: u?.email ?? '' });
  }

  private stripCreateQueryParam(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {},
    });
  }

  onTenantItemActivate(tenantId: string): void {
    if (this.selectingId() !== null) {
      return;
    }
    void this.chooseTenant(tenantId);
  }

  async chooseTenant(tenantId: string): Promise<void> {
    this.selectError.set(null);
    this.selectingId.set(tenantId);
    try {
      await this.auth.selectTenant(tenantId);
      await this.router.navigate([APP_PATHS.dashboard]);
    } catch (err) {
      const msg =
        err instanceof HttpErrorResponse ? problemDetailMessage(err) : 'Could not open this workspace.';
      this.selectError.set(msg);
      if (err instanceof HttpErrorResponse && (err.status === 403 || err.status === 404)) {
        try {
          const session = await this.auth.refreshSessionState();
          this.user.set(session);
        } catch {
          /* keep existing list */
        }
      }
    } finally {
      this.selectingId.set(null);
    }
  }

  onCreateSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.commitCreate();
  }

  private async commitCreate(): Promise<void> {
    this.creating.set(true);
    try {
      await submit(this.createForm, async (field) => {
        try {
          const { name, email: mail } = field().value();
          const created = await this.auth.createTenant({
            name: name.trim(),
            email: mail.trim(),
          });
          const u = this.user();
          this.createModel.set({ name: '', email: u?.email ?? '' });
          const pending = this.auth.getPendingTenantSelection();
          if (pending) {
            this.user.set(pending);
          }
          await this.auth.selectTenant(created.id);
          await this.router.navigate([APP_PATHS.dashboard]);
          return;
        } catch (err) {
          const message =
            err instanceof HttpErrorResponse ? problemDetailMessage(err) : 'Could not create company.';
          return [{ fieldTree: field, kind: 'server', message }];
        }
      });
    } finally {
      this.creating.set(false);
    }
  }
}
