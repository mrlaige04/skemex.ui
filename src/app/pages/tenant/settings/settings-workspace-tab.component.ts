import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputImports } from 'spartan/input';
import { HlmLabelImports } from 'spartan/label';
import { problemDetailMessage } from '../../../http/problem-details';
import { PERMISSIONS } from '../../../models/auth/permissions';
import { AuthService } from '../../../services/auth/auth.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-settings-workspace-tab',
  imports: [
    FormField,
    NgIcon,
    HasPermissionDirective,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputImports,
    ...HlmLabelImports,
  ],
  providers: [provideIcons({ lucideLoaderCircle })],
  templateUrl: './settings-workspace-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsWorkspaceTabComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly permissions = PERMISSIONS;

  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal<string | null>(null);

  private readonly model = signal({ name: '' });
  readonly workspaceForm = form(this.model, (f) => {
    required(f.name);
    maxLength(f.name, 256);
  });

  ngOnInit(): void {
    this.model.set({ name: this.auth.workspaceContext()?.tenantName ?? '' });
  }

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.commit();
  }

  private async commit(): Promise<void> {
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);
    try {
      await submit(this.workspaceForm, async (field) => {
        try {
          const { name } = field().value();
          await this.auth.updateCurrentTenant({ name: name.trim() });
          this.saved.set(true);
          return;
        } catch (err) {
          const message =
            err instanceof HttpErrorResponse ? problemDetailMessage(err) : 'Could not update workspace.';
          this.error.set(message);
          return [{ fieldTree: field, kind: 'server', message }];
        }
      });
    } finally {
      this.saving.set(false);
    }
  }
}
