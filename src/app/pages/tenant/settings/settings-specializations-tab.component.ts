import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideLoaderCircle,
  lucidePencil,
  lucidePlus,
  lucideTrash2,
  lucideX,
} from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputImports } from 'spartan/input';
import { HlmLabelImports } from 'spartan/label';
import { problemDetailMessage } from '../../../http/problem-details';
import type { TenantSpecializationDto } from '../../../models/tenant-specializations/tenant-specializations.models';
import { TenantSpecializationsService } from '../../../services/tenant-specializations/tenant-specializations.service';
import { ConfirmAlertDialogComponent } from '../../../shared/confirm-alert-dialog/confirm-alert-dialog.component';
import { TaskTagsInputComponent } from '../../../shared/task-tags-input/task-tags-input.component';

@Component({
  selector: 'app-settings-specializations-tab',
  imports: [
    NgIcon,
    ConfirmAlertDialogComponent,
    TaskTagsInputComponent,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputImports,
    ...HlmLabelImports,
  ],
  providers: [
    provideIcons({
      lucideLoaderCircle,
      lucidePencil,
      lucidePlus,
      lucideTrash2,
      lucideX,
    }),
  ],
  templateUrl: './settings-specializations-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSpecializationsTabComponent implements OnInit {
  private readonly specializationsService = inject(TenantSpecializationsService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly specializations = signal<TenantSpecializationDto[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly confirmDialogState = signal<'open' | 'closed'>('closed');
  readonly pendingDelete = signal<TenantSpecializationDto | null>(null);
  readonly showCreateForm = signal(false);
  readonly createSubmitted = signal(false);
  readonly editSubmitted = signal(false);

  readonly createModel = signal({
    title: '',
    description: '',
    defaultSkills: [] as string[],
  });

  readonly editModel = signal({
    title: '',
    description: '',
    defaultSkills: [] as string[],
  });

  readonly canCreate = computed(() => {
    const model = this.createModel();
    return !this.saving() && model.title.trim().length > 0;
  });

  readonly canSaveEdit = computed(() => {
    const model = this.editModel();
    return !this.saving() && model.title.trim().length > 0;
  });

  ngOnInit(): void {
    void this.loadSpecializations();
  }

  toggleCreateForm(): void {
    this.showCreateForm.update((value) => !value);
    if (this.showCreateForm()) {
      this.editingId.set(null);
      this.createModel.set({ title: '', description: '', defaultSkills: [] });
      this.createSubmitted.set(false);
    }
  }

  updateCreateField(field: 'title' | 'description', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.createModel.update((model) => ({ ...model, [field]: value }));
  }

  onCreateSkillsChange(skills: string[]): void {
    this.createModel.update((model) => ({ ...model, defaultSkills: skills }));
  }

  async createSpecialization(event: Event): Promise<void> {
    event.preventDefault();
    this.createSubmitted.set(true);
    if (!this.canCreate()) {
      return;
    }

    const model = this.createModel();
    this.saving.set(true);
    this.error.set(null);
    try {
      const created = await this.specializationsService.create({
        title: model.title.trim(),
        description: model.description.trim() || null,
        defaultSkills: model.defaultSkills,
      });
      this.specializations.update((items) =>
        [...items, created].sort((left, right) => left.title.localeCompare(right.title)),
      );
      this.showCreateForm.set(false);
      this.createModel.set({ title: '', description: '', defaultSkills: [] });
      this.createSubmitted.set(false);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.saving.set(false);
    }
  }

  startEdit(item: TenantSpecializationDto): void {
    this.showCreateForm.set(false);
    this.editingId.set(item.id);
    this.editModel.set({
      title: item.title,
      description: item.description ?? '',
      defaultSkills: [...(item.defaultSkills ?? [])],
    });
    this.editSubmitted.set(false);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editSubmitted.set(false);
  }

  updateEditField(field: 'title' | 'description', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.editModel.update((model) => ({ ...model, [field]: value }));
  }

  onEditSkillsChange(skills: string[]): void {
    this.editModel.update((model) => ({ ...model, defaultSkills: skills }));
  }

  async saveEdit(event: Event): Promise<void> {
    event.preventDefault();
    const id = this.editingId();
    if (!id) {
      return;
    }

    this.editSubmitted.set(true);
    if (!this.canSaveEdit()) {
      return;
    }

    const model = this.editModel();
    this.saving.set(true);
    this.error.set(null);
    try {
      const updated = await this.specializationsService.update(id, {
        title: model.title.trim(),
        description: model.description.trim() || null,
        defaultSkills: model.defaultSkills,
      });
      this.specializations.update((items) =>
        items
          .map((item) => (item.id === updated.id ? updated : item))
          .sort((left, right) => left.title.localeCompare(right.title)),
      );
      this.editingId.set(null);
      this.editSubmitted.set(false);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.saving.set(false);
    }
  }

  deleteSpecialization(item: TenantSpecializationDto): void {
    this.pendingDelete.set(item);
    this.confirmDialogState.set('open');
  }

  pendingDeleteTitle(): string {
    return this.pendingDelete()?.title ?? '';
  }

  async confirmDelete(): Promise<void> {
    const item = this.pendingDelete();
    this.pendingDelete.set(null);
    if (!item) {
      return;
    }

    this.deletingId.set(item.id);
    this.error.set(null);
    try {
      await this.specializationsService.delete(item.id);
      this.specializations.update((items) => items.filter((entry) => entry.id !== item.id));
      if (this.editingId() === item.id) {
        this.editingId.set(null);
      }
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.deletingId.set(null);
    }
  }

  private async loadSpecializations(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const items = await this.specializationsService.list();
      this.specializations.set(items);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
      this.specializations.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
