import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from 'spartan/button';
import { problemDetailMessage } from '../../../http/problem-details';
import { APP_PATHS } from '../../../routing/app-paths';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-external-auth-callback-page',
  imports: [RouterLink, ...HlmButtonImports],
  template: `
    <div class="auth-page">
      <h1 class="auth-page__title">Signing you in</h1>
      @if (error(); as err) {
        <p class="auth-page__subtitle">We could not finish social sign-in.</p>
        <p class="auth-alert auth-alert--error mt-6" role="alert">{{ err }}</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <a hlmBtn routerLink="/auth/login">Back to sign in</a>
          <a hlmBtn variant="outline" routerLink="/auth/register">Create account</a>
        </div>
      } @else {
        <p class="auth-page__subtitle">{{ status() }}</p>
      }
    </div>
  `,
  styleUrl: '../login/login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExternalAuthCallbackPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly status = signal('Completing sign-in…');
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.complete();
  }

  private async complete(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const oauthError = params.get('error');
    if (oauthError?.trim()) {
      this.error.set(oauthError.trim());
      return;
    }

    const code = params.get('code')?.trim();
    if (!code) {
      this.error.set('Missing sign-in code. Please try again.');
      return;
    }

    try {
      await this.auth.exchangeExternalLogin(code);
      if (this.auth.isSuperAdmin()) {
        await this.router.navigate([APP_PATHS.adminDashboard]);
      } else {
        await this.router.navigate([APP_PATHS.select]);
      }
    } catch (err) {
      this.error.set(formatError(err));
      this.status.set('Sign-in failed');
    }
  }
}

function formatError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return problemDetailMessage(err);
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return 'Something went wrong during social sign-in.';
}
