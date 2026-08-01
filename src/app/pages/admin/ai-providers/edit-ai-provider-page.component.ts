import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
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
  SaAiProviderModelDto,
} from '../../../models/admin/ai-providers.models';
import { adminAbsolutePath } from '../../../routing/app-paths';
import { SaAiProvidersService } from '../../../services/admin/sa-ai-providers.service';

interface AuthRow {
  type: AiProviderAuthEntryType;
  name: string;
  value: string;
  hasValue: boolean;
}

interface ModelEditRow {
  id: string;
  provider: string;
  providerName: string;
  externalId: string;
  author: string | null;
  iconKey: string | null;
  createdAt: string;
  updatedAt: string | null;
  displayName: string;
  isActive: boolean;
  savedDisplayName: string;
  savedIsActive: boolean;
  saving: boolean;
  error: string | null;
}

@Component({
  selector: 'app-edit-ai-provider-page',
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
  templateUrl: './edit-ai-provider-page.component.html',
  styleUrl: './edit-ai-provider-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditAiProviderPageComponent implements OnInit {
  private readonly providersService = inject(SaAiProvidersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly modelsLoading = signal(false);
  readonly modelsError = signal<string | null>(null);
  readonly modelRows = signal<ModelEditRow[]>([]);
  readonly providersListLink = adminAbsolutePath('ai-providers');
  readonly pageTitle = signal('Edit AI provider');
  readonly providerKey = signal('');
  readonly authRows = signal<AuthRow[]>([]);
  readonly authTypes: { value: AiProviderAuthEntryType; label: string }[] = [
    { value: 'header', label: 'Header' },
    { value: 'query', label: 'Query' },
  ];

  private readonly providerId = this.route.snapshot.paramMap.get('providerId') ?? '';

  readonly model = signal({
    name: '',
    baseUrl: '',
    isEnabled: true,
  });

  readonly providerForm = form(this.model, (f) => {
    required(f.name);
    maxLength(f.name, 120);
    required(f.baseUrl);
    maxLength(f.baseUrl, 512);
  });

  ngOnInit(): void {
    if (!this.providerId) {
      this.loadError.set('Provider id is missing.');
      this.loading.set(false);
      return;
    }

    void this.loadProvider();
  }

  addAuthRow(): void {
    this.authRows.update((rows) => [
      ...rows,
      { type: 'header', name: '', value: '', hasValue: false },
    ]);
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

  updateModelRow(modelId: string, patch: Partial<Pick<ModelEditRow, 'displayName' | 'isActive'>>): void {
    this.modelRows.update((rows) =>
      rows.map((row) =>
        row.id === modelId ? { ...row, ...patch, error: null } : row,
      ),
    );
  }

  isModelDirty(row: ModelEditRow): boolean {
    return (
      row.displayName.trim() !== row.savedDisplayName ||
      row.isActive !== row.savedIsActive
    );
  }

  async saveModel(modelId: string): Promise<void> {
    const row = this.modelRows().find((r) => r.id === modelId);
    if (!row || row.saving || !this.isModelDirty(row) || !this.providerId) {
      return;
    }

    const displayName = row.displayName.trim();
    if (!displayName) {
      this.modelRows.update((rows) =>
        rows.map((r) =>
          r.id === modelId ? { ...r, error: 'Display name is required.' } : r,
        ),
      );
      return;
    }

    this.modelRows.update((rows) =>
      rows.map((r) => (r.id === modelId ? { ...r, saving: true, error: null } : r)),
    );

    try {
      const updated = await this.providersService.updateModel(this.providerId, modelId, {
        displayName,
        isActive: row.isActive,
      });
      this.modelRows.update((rows) =>
        rows.map((r) => (r.id === modelId ? this.toModelRow(updated) : r)),
      );
    } catch (err) {
      const message =
        err instanceof HttpErrorResponse
          ? problemDetailMessage(err)
          : 'Could not update model.';
      this.modelRows.update((rows) =>
        rows.map((r) => (r.id === modelId ? { ...r, saving: false, error: message } : r)),
      );
    }
  }

  private async loadProvider(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const provider = await this.providersService.get(this.providerId);
      this.pageTitle.set(provider.name);
      this.providerKey.set(provider.key);
      this.model.set({
        name: provider.name,
        baseUrl: provider.baseUrl,
        isEnabled: provider.isEnabled,
      });
      this.authRows.set(
        (provider.authEntries ?? []).map((entry) => ({
          type: (entry.type === 'query' ? 'query' : 'header') as AiProviderAuthEntryType,
          name: entry.name,
          value: '',
          hasValue: entry.hasValue,
        })),
      );
      void this.loadModels();
    } catch (err) {
      this.loadError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadModels(): Promise<void> {
    this.modelsLoading.set(true);
    this.modelsError.set(null);
    try {
      const models = await this.providersService.listModels(this.providerId);
      this.modelRows.set(models.map((m) => this.toModelRow(m)));
    } catch (err) {
      this.modelsError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.modelsLoading.set(false);
    }
  }

  private toModelRow(model: SaAiProviderModelDto): ModelEditRow {
    return {
      id: model.id,
      provider: model.provider,
      providerName: model.providerName,
      externalId: model.externalId,
      author: model.author ?? null,
      iconKey: model.iconKey ?? null,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt ?? null,
      displayName: model.displayName,
      isActive: model.isActive,
      savedDisplayName: model.displayName,
      savedIsActive: model.isActive,
      saving: false,
      error: null,
    };
  }

  private async commit(): Promise<void> {
    if (this.saving() || !this.providerId) {
      return;
    }

    this.saving.set(true);
    try {
      await submit(this.providerForm, async (field) => {
        try {
          const m = field().value();
          await this.providersService.update(this.providerId, {
            name: m.name.trim(),
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
              : 'Could not update AI provider.';
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
        value: row.value.trim() || null,
      }));
  }
}
