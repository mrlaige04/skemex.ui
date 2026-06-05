import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { email, FormField, form, maxLength, minLength, required, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideKeyRound, lucideMail, lucideShieldCheck } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmLabelImports } from 'spartan/label';
import { problemDetailMessage } from '../../../http/problem-details';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-forgot-password-page',
  imports: [
    RouterLink,
    FormField,
    NgIcon,
    ...HlmButtonImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideKeyRound, lucideMail, lucideShieldCheck })],
  templateUrl: './forgot-password-page.component.html',
  styleUrl: './forgot-password-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly step = signal<'email' | 'reset' | 'done'>('email');
  readonly submitting = signal(false);
  readonly infoMessage = signal<string | null>(null);

  readonly emailModel = signal({ email: '' });
  private readonly resetModel = signal({
    code: '',
    newPassword: '',
    confirmPassword: '',
  });

  readonly emailForm = form(this.emailModel, (f) => {
    required(f.email);
    email(f.email);
    maxLength(f.email, 256);
  });

  readonly resetForm = form(this.resetModel, (f) => {
    required(f.code);
    minLength(f.code, 6);
    maxLength(f.code, 6);
    required(f.newPassword);
    minLength(f.newPassword, 6);
    required(f.confirmPassword);
    minLength(f.confirmPassword, 6);
  });

  onEmailSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.sendCode();
  }

  onResetSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.resetPassword();
  }

  useDifferentEmail(): void {
    this.step.set('email');
    this.infoMessage.set(null);
    this.resetModel.set({ code: '', newPassword: '', confirmPassword: '' });
  }

  private async sendCode(): Promise<void> {
    this.submitting.set(true);
    try {
      await submit(this.emailForm, async (field) => {
        try {
          const mail = field().value().email.trim();
          const res = await this.auth.requestPasswordReset({ email: mail });
          this.infoMessage.set(res.message);
          this.step.set('reset');
          return;
        } catch (err) {
          const message =
            err instanceof HttpErrorResponse ? problemDetailMessage(err) : 'Could not send reset code.';
          return [{ fieldTree: field, kind: 'server', message }];
        }
      });
    } finally {
      this.submitting.set(false);
    }
  }

  private async resetPassword(): Promise<void> {
    this.submitting.set(true);
    try {
      await submit(this.resetForm, async (field) => {
        const { code, newPassword, confirmPassword } = field().value();
        const mail = this.emailModel().email.trim();

        if (newPassword !== confirmPassword) {
          return [
            {
              fieldTree: field.confirmPassword,
              kind: 'custom',
              message: 'Passwords do not match.',
            },
          ];
        }

        try {
          const res = await this.auth.resetPasswordWithCode({
            email: mail,
            code: code.trim(),
            newPassword,
          });
          this.infoMessage.set(res.message);
          this.step.set('done');
          return;
        } catch (err) {
          const message =
            err instanceof HttpErrorResponse ? problemDetailMessage(err) : 'Could not reset password.';
          return [{ fieldTree: field, kind: 'server', message }];
        }
      });
    } finally {
      this.submitting.set(false);
    }
  }

  goToLogin(): void {
    void this.router.navigate(['/auth', 'login']);
  }
}
