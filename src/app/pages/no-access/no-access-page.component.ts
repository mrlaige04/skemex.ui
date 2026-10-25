import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideShieldOff } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import { AuthService } from '../../services/auth/auth.service';
import { APP_PATHS } from '../../routing/app-paths';

@Component({
  selector: 'app-no-access-page',
  imports: [RouterLink, NgIcon, ...HlmButtonImports, ...HlmIconImports],
  providers: [provideIcons({ lucideShieldOff })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <div class="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
        <ng-icon hlm name="lucideShieldOff" class="size-7" />
      </div>
      <div class="max-w-md space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight">No access</h1>
        <p class="text-muted-foreground text-sm">
          You do not have permission to view this page. Ask a workspace admin to update your role if you
          need access.
        </p>
      </div>
      <a hlmBtn [routerLink]="homeLink">Go back</a>
    </div>
  `,
})
export class NoAccessPageComponent {
  private readonly auth = inject(AuthService);

  readonly homeLink = this.auth.isSuperAdmin()
    ? APP_PATHS.adminDashboard
    : this.auth.workspaceContext()
      ? APP_PATHS.dashboard
      : APP_PATHS.select;
}
