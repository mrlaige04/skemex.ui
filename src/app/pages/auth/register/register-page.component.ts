import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { email, FormField, form, maxLength, minLength, required, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideKeyRound, lucideMail, lucideUser } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmLabelImports } from 'spartan/label';
import { problemDetailMessage } from '../../../http/problem-details';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-register-page',
  imports: [
    FormField,
    RouterLink,
    NgIcon,
    ...HlmButtonImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
  ],
  providers: [provideIcons({ lucideMail, lucideKeyRound, lucideUser })],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);

  private readonly model = signal({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  readonly registerForm = form(this.model, (f) => {
    required(f.firstName);
    maxLength(f.firstName, 128);
    required(f.lastName);
    maxLength(f.lastName, 128);
    required(f.email);
    email(f.email);
    required(f.password);
    minLength(f.password, 6);
  });

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.commit();
  }

  private async commit(): Promise<void> {
    this.submitting.set(true);
    try {
      await submit(this.registerForm, async (field) => {
        try {
          const v = field().value();
          await this.auth.register({
            firstName: v.firstName,
            lastName: v.lastName,
            email: v.email,
            password: v.password,
          });
          await this.router.navigate(['/auth', 'login']);
          return;
        } catch (err) {
          const message =
            err instanceof HttpErrorResponse ? problemDetailMessage(err) : 'Something went wrong';
          return [{ fieldTree: field, kind: 'server', message }];
        }
      });
    } finally {
      this.submitting.set(false);
    }
  }
}
