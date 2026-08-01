import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormField, form, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBot, lucidePlus, lucideTrash2 } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmCheckboxImports } from 'spartan/checkbox';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputImports } from 'spartan/input';
import { HlmLabelImports } from 'spartan/label';
import { HlmSelectImports } from 'spartan/select';
import { problemDetailMessage } from '../../../http/problem-details';
import type {
  AiProviderAuthEntryType,
  SaAiProviderAuthEntryInput,
} from '../../../models/admin/ai-providers.models';
import { adminAbsolutePath } from '../../../routing/app-paths';
import { SaAiProvidersService } from '../../../services/admin/sa-ai-providers.service';

interface AuthRow {
  type: AiProviderAuthEntryType;
  name: string;
  value: string;
}

@Component({
  selector: 'app-create-ai-provider-page',
  imports: [
    RouterLink,
    FormField,
    NgIcon,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmCheckboxImports,
    ...HlmIconImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideBot, lucidePlus, lucideTrash2 })],
  templateUrl: './create-ai-provider-page.component.html',
  styleUrl: './create-ai-provider-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAiProviderPageComponent {
  private readonly providersService = inject(SaAiProvidersService);
  private readonly router = inject(Router);

  readonly saving = signal(false);
  readonly providersListLink = adminAbsolutePath('ai-providers');
  readonly authRows = signal<AuthRow[]>([]);
  readonly authTypes: { value: AiProviderAuthEntryType; label: string }[] = [
    { value: 'header', label: 'Header' },
    { value: 'query', label: 'Query' },
  ];

  readonly model = signal({
    name: '',
    key: '',
    baseUrl: '',
    isEnabled: true,
  });

  readonly providerForm = form(this.model, (f) => {
    required(f.name);
    maxLength(f.name, 120);
    required(f.key);
    maxLength(f.key, 64);
    pattern(f.key, /^[A-Za-z0-9_-]+$/);
    required(f.baseUrl);
    maxLength(f.baseUrl, 512);
  });

  addAuthRow(): void {
    this.authRows.update((rows) => [...rows, { type: 'header', name: '', value: '' }]);
  }

  removeAuthRow(index: number): void {
    this.authRows.update((rows) => rows.filter((_, i) => i !== index));
  }

  updateAuthRow(index: number, patch: Partial<AuthRow>): void {
    this.authRows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  onAuthTypeChange(index: number, value: string | null): void {
    if (value !== 'header' && value !== 'query') {
      return;
    }
    this.updateAuthRow(index, { type: value });
  }

  onEnabledChange(checked: boolean): void {
    this.model.update((m) => ({ ...m, isEnabled: checked }));
  }

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.commit();
  }

  private async commit(): Promise<void> {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    try {
      await submit(this.providerForm, async (field) => {
        try {
          const m = field().value();
          await this.providersService.create({
            name: m.name.trim(),
            key: m.key.trim(),
            baseUrl: m.baseUrl.trim(),
            isEnabled: m.isEnabled,
            authEntries: this.toAuthInputs(),
          });
          await this.router.navigate(this.providersListLink);
          return;
        } catch (err) {
          const message =
            err instanceof HttpErrorResponse
              ? problemDetailMessage(err)
              : 'Could not create AI provider.';
          return [{ fieldTree: field, kind: 'server', message }];
        }
      });
    } finally {
      this.saving.set(false);
    }
  }

  private toAuthInputs(): SaAiProviderAuthEntryInput[] {
    return this.authRows()
      .filter((row) => row.name.trim().length > 0)
      .map((row) => ({
        type: row.type,
        name: row.name.trim(),
        value: row.value,
      }));
  }
}
