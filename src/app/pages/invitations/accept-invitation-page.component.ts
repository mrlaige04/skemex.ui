import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormField, form, minLength, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBuilding2, lucideKeyRound, lucideLoaderCircle, lucideMail, lucideUser } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmLabelImports } from 'spartan/label';
import { problemDetailMessage } from '../../http/problem-details';
import type { AcceptTenantInvitationResponse, TenantInvitationPreview } from '../../models/auth/auth.models';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-accept-invitation-page',
  imports: [
    RouterLink,
    FormField,
    NgIcon,
    ...HlmButtonImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
  ],
  providers: [provideIcons({ lucideBuilding2, lucideKeyRound, lucideLoaderCircle, lucideMail, lucideUser })],
  templateUrl: './accept-invitation-page.component.html',
  styleUrl: './accept-invitation-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcceptInvitationPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly preview = signal<TenantInvitationPreview | null>(null);
  readonly accepted = signal<AcceptTenantInvitationResponse | null>(null);
  readonly submitting = signal(false);
  readonly acceptError = signal<string | null>(null);

  private readonly token = signal('');

  readonly inviteeName = computed(() => {
    const p = this.preview();
    if (!p) {
      return '';
    }
    return `${p.firstName} ${p.lastName}`.trim();
  });

  readonly loginLink = computed(() => ['/auth', 'login'] as const);

  private readonly model = signal({
    password: '',
    confirmPassword: '',
  });

  readonly acceptForm = form(this.model, (f) => {
    minLength(f.password, 6);
    minLength(f.confirmPassword, 6);
  });

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    this.token.set(token);

    if (!token) {
      this.loading.set(false);
      this.loadError.set('This invitation link is missing a token.');
      return;
    }

    void this.loadInvitation(token);
  }

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.commit();
  }

  private async loadInvitation(token: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    try {
      const result = await this.auth.getInvitation(token);
      this.preview.set(result);
    } catch (err) {
      const message =
        err instanceof HttpErrorResponse
          ? problemDetailMessage(err)
          : 'This invitation could not be loaded.';
      this.loadError.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  private async commit(): Promise<void> {
    const token = this.token();
    const preview = this.preview();
    if (!token || !preview || preview.isExpired) {
      return;
    }

    this.submitting.set(true);
    this.acceptError.set(null);
    try {
      if (preview.requiresPassword) {
        await submit(this.acceptForm, async (field) => {
          const { password, confirmPassword } = field().value();
          if (!password.trim()) {
            return [{ fieldTree: field.password, kind: 'required', message: 'Password is required.' }];
          }
          if (password.length < 6) {
            return [
              {
                fieldTree: field.password,
                kind: 'minLength',
                message: 'Password must be at least 6 characters.',
              },
            ];
          }
          if (password !== confirmPassword) {
            return [
              {
                fieldTree: field.confirmPassword,
                kind: 'custom',
                message: 'Passwords do not match.',
              },
            ];
          }

          try {
            const result = await this.auth.acceptInvitation({ token, password });
            this.accepted.set(result);
            return;
          } catch (err) {
            const message =
              err instanceof HttpErrorResponse
                ? problemDetailMessage(err)
                : 'Could not accept this invitation.';
            return [{ fieldTree: field, kind: 'server', message }];
          }
        });
      } else {
        try {
          const result = await this.auth.acceptInvitation({ token });
          this.accepted.set(result);
        } catch (err) {
          const message =
            err instanceof HttpErrorResponse
              ? problemDetailMessage(err)
              : 'Could not accept this invitation.';
          this.acceptError.set(message);
        }
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
