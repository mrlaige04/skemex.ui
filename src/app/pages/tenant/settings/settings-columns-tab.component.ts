import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
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
  lucideCheck,
  lucideGripVertical,
  lucideLoaderCircle,
  lucidePencil,
  lucidePlus,
  lucideTrash2,
  lucideX,
} from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmCheckboxImports } from 'spartan/checkbox';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmInputImports } from 'spartan/input';
import { HlmLabelImports } from 'spartan/label';
import { problemDetailMessage } from '../../../http/problem-details';
import type { TenantColumnDto } from '../../../models/tenant-columns/tenant-columns.models';
import { TenantColumnsService } from '../../../services/tenant-columns/tenant-columns.service';
import { ConfirmAlertDialogComponent } from '../../../shared/confirm-alert-dialog/confirm-alert-dialog.component';

function slugifyKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const DEFAULT_KANBAN_COLUMNS = [
  { key: 'backlog', title: 'Backlog' },
  { key: 'todo', title: 'To Do' },
  { key: 'in-progress', title: 'In Progress' },
  { key: 'in-qa', title: 'In QA' },
  { key: 'done', title: 'Done' },
] as const;

@Component({
  selector: 'app-settings-columns-tab',
  imports: [
    NgIcon,
    CdkDrag,
    CdkDropList,
    ConfirmAlertDialogComponent,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmCheckboxImports,
    ...HlmIconImports,
    ...HlmInputImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
  ],
  providers: [
    provideIcons({
      lucideCheck,
      lucideGripVertical,
      lucideLoaderCircle,
      lucidePencil,
      lucidePlus,
      lucideTrash2,
      lucideX,
    }),
  ],
  templateUrl: './settings-columns-tab.component.html',
  styleUrl: './settings-columns-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsColumnsTabComponent implements OnInit {
  private readonly tenantColumnsService = inject(TenantColumnsService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly reordering = signal(false);
  readonly error = signal<string | null>(null);
  readonly columns = signal<TenantColumnDto[]>([]);
  readonly editingColumnId = signal<string | null>(null);
  readonly deletingColumnId = signal<string | null>(null);
  readonly confirmDialogState = signal<'open' | 'closed'>('closed');
  readonly pendingDeleteColumn = signal<TenantColumnDto | null>(null);
  readonly showCreateForm = signal(false);
  readonly createSubmitted = signal(false);
  readonly editSubmitted = signal(false);

  readonly createModel = signal({
    key: '',
    title: '',
    description: '',
    isRequired: false,
    isSortOrderForced: false,
  });

  readonly editModel = signal({
    title: '',
    description: '',
    isRequired: false,
    isSortOrderForced: false,
  });

  readonly canCreate = computed(() => {
    const model = this.createModel();
    return !this.saving() && model.title.trim().length > 0 && slugifyKey(model.key).length > 0;
  });

  readonly canSaveEdit = computed(() => {
    const model = this.editModel();
    return !this.saving() && model.title.trim().length > 0;
  });

  readonly seedingDefaults = signal(false);

  ngOnInit(): void {
    void this.loadColumns();
  }

  toggleCreateForm(): void {
    this.showCreateForm.update((value) => !value);
    if (this.showCreateForm()) {
      this.editingColumnId.set(null);
      this.createModel.set({ key: '', title: '', description: '', isRequired: false, isSortOrderForced: false });
      this.createSubmitted.set(false);
    }
  }

  updateCreateField(field: 'key' | 'title' | 'description', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.createModel.update((model) => ({ ...model, [field]: value }));
  }

  toggleCreateFlag(field: 'isRequired' | 'isSortOrderForced', checked: boolean): void {
    this.createModel.update((model) => ({ ...model, [field]: checked }));
  }

  onCreateTitleInput(event: Event): void {
    const title = (event.target as HTMLInputElement).value;
    this.createModel.update((model) => ({
      ...model,
      title,
      key: model.key.trim().length > 0 ? model.key : slugifyKey(title),
    }));
  }

  async createColumn(event: Event): Promise<void> {
    event.preventDefault();
    this.createSubmitted.set(true);
    if (!this.canCreate()) {
      return;
    }

    const model = this.createModel();
    this.saving.set(true);
    this.error.set(null);
    try {
      const created = await this.tenantColumnsService.create({
        key: slugifyKey(model.key),
        title: model.title.trim(),
        description: model.description.trim() || null,
        isRequired: model.isRequired,
        isSortOrderForced: model.isSortOrderForced,
      });
      this.columns.update((items) =>
        [...items, created].sort(
          (left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title),
        ),
      );
      this.showCreateForm.set(false);
      this.createModel.set({ key: '', title: '', description: '', isRequired: false, isSortOrderForced: false });
      this.createSubmitted.set(false);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.saving.set(false);
    }
  }

  startEdit(column: TenantColumnDto): void {
    this.showCreateForm.set(false);
    this.editingColumnId.set(column.id);
    this.editModel.set({
      title: column.title,
      description: column.description ?? '',
      isRequired: column.isRequired,
      isSortOrderForced: column.isSortOrderForced,
    });
    this.editSubmitted.set(false);
  }

  cancelEdit(): void {
    this.editingColumnId.set(null);
    this.editSubmitted.set(false);
  }

  updateEditField(field: 'title' | 'description', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.editModel.update((model) => ({ ...model, [field]: value }));
  }

  toggleEditFlag(field: 'isRequired' | 'isSortOrderForced', checked: boolean): void {
    this.editModel.update((model) => ({ ...model, [field]: checked }));
  }

  async saveEdit(event: Event): Promise<void> {
    event.preventDefault();
    const columnId = this.editingColumnId();
    if (!columnId) {
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
      const updated = await this.tenantColumnsService.update(columnId, {
        title: model.title.trim(),
        description: model.description.trim() || null,
        isRequired: model.isRequired,
        isSortOrderForced: model.isSortOrderForced,
      });
      this.columns.update((items) =>
        items
          .map((item) => (item.id === updated.id ? updated : item))
          .sort(
            (left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title),
          ),
      );
      this.editingColumnId.set(null);
      this.editSubmitted.set(false);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.saving.set(false);
    }
  }

  deleteColumn(column: TenantColumnDto): void {
    this.pendingDeleteColumn.set(column);
    this.confirmDialogState.set('open');
  }

  pendingDeleteColumnTitle(): string {
    return this.pendingDeleteColumn()?.title ?? '';
  }

  async confirmDeleteColumn(): Promise<void> {
    const column = this.pendingDeleteColumn();
    this.pendingDeleteColumn.set(null);
    if (!column) {
      return;
    }

    this.deletingColumnId.set(column.id);
    this.error.set(null);
    try {
      await this.tenantColumnsService.delete(column.id);
      this.columns.update((items) =>
        items
          .filter((item) => item.id !== column.id)
          .map((item, index) => ({ ...item, sortOrder: index })),
      );
      if (this.editingColumnId() === column.id) {
        this.editingColumnId.set(null);
      }
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.deletingColumnId.set(null);
    }
  }

  async addDefaultColumns(): Promise<void> {
    this.seedingDefaults.set(true);
    this.error.set(null);
    try {
      for (const column of DEFAULT_KANBAN_COLUMNS) {
        await this.tenantColumnsService.create({
          key: column.key,
          title: column.title,
        });
      }
      await this.loadColumns();
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
      await this.loadColumns();
    } finally {
      this.seedingDefaults.set(false);
    }
  }

  async onColumnDrop(event: CdkDragDrop<TenantColumnDto[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const items = [...this.columns()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    this.columns.set(items.map((item, index) => ({ ...item, sortOrder: index })));

    this.reordering.set(true);
    this.error.set(null);
    try {
      const reordered = await this.tenantColumnsService.reorder({
        columnIds: items.map((item) => item.id),
      });
      this.columns.set(reordered);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
      await this.loadColumns();
    } finally {
      this.reordering.set(false);
    }
  }

  private async loadColumns(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const items = await this.tenantColumnsService.list();
      this.columns.set(items);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
      this.columns.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
