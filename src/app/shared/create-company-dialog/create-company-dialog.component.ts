import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { email, FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { BrnDialogContent } from '@spartan-ng/brain/dialog';
import { HlmDialogImports } from 'spartan/dialog';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmLabelImports } from 'spartan/label';
import { APP_PATHS } from '../../routing/app-paths';
import { problemDetailMessage } from '../../http/problem-details';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-create-company-dialog',
  imports: [BrnDialogContent, FormField, ...HlmDialogImports, ...HlmInputGroupImports, ...HlmLabelImports],
  templateUrl: './create-company-dialog.component.html',
  styleUrl: './create-company-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCompanyDialogComponent {
  private readonly auth = inject(AuthService);

  /** Controlled open/closed state from the parent. */
  readonly state = input<'open' | 'closed'>('closed');
  readonly stateChange = output<'open' | 'closed'>();

  readonly creating = signal(false);

  private readonly createModel = signal({ name: '', email: '' });
  readonly createForm = form(this.createModel, (f) => {
    required(f.name);
    maxLength(f.name, 256);
    required(f.email);
    email(f.email);
    maxLength(f.email, 256);
  });

  constructor() {
    effect(() => {
      if (this.state() === 'open') {
        this.resetForm();
      }
    });
  }

  onStateChanged(next: 'open' | 'closed'): void {
    this.stateChange.emit(next);
  }

  onClosed(): void {
    this.resetForm();
    this.stateChange.emit('closed');
  }

  private resetForm(): void {
    this.createModel.set({
      name: '',
      email: this.auth.workspaceContext()?.userEmail ?? '',
    });
  }

  onSubmit(event: SubmitEvent): void {
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
          await this.auth.selectTenant(created.id);
          window.location.assign(APP_PATHS.dashboard);
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
