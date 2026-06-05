import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { email, FormField, form, required, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideGithub, lucideKeyRound, lucideMail } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmLabelImports } from 'spartan/label';
import { APP_PATHS } from '../../../routing/app-paths';
import { problemDetailMessage } from '../../../http/problem-details';
import { AuthService } from '../../../services/auth/auth.service';

function formatLoginError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return problemDetailMessage(err);
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return 'Something went wrong';
}

@Component({
  selector: 'app-login-page',
  imports: [
    FormField,
    RouterLink,
    NgIcon,
    ...HlmButtonImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
  ],
  providers: [provideIcons({ lucideMail, lucideKeyRound, lucideGithub })],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);

  private readonly model = signal({
    email: '',
    password: '',
  });

  readonly loginForm = form(this.model, (f) => {
    required(f.email);
    email(f.email);
    required(f.password);
  });

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.commit();
  }

  private async commit(): Promise<void> {
    this.submitting.set(true);
    try {
      await submit(this.loginForm, async (field) => {
        try {
          const { email: mail, password } = field().value();
          await this.auth.login({ email: mail, password });
          await this.router.navigate([APP_PATHS.select]);
          return;
        } catch (err) {
          const message = formatLoginError(err);
          return [{ fieldTree: field, kind: 'server', message }];
        }
      });
    } finally {
      this.submitting.set(false);
    }
  }
}
