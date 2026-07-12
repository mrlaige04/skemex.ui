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
import { ActivatedRoute } from '@angular/router';
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
import { HlmIconImports } from 'spartan/icon';
import { HlmInputImports } from 'spartan/input';
import { HlmLabelImports } from 'spartan/label';
import { HlmSelectImports } from 'spartan/select';
import { problemDetailMessage } from '../../http/problem-details';
import type { ProjectColumnDto, ProjectSettingsDto } from '../../models/projects/projects.models';
import type { TenantColumnDto } from '../../models/tenant-columns/tenant-columns.models';
import { ProjectsService } from '../../services/projects/projects.service';
import {
  computeProjectColumnSortOrders,
  formatSortOrder,
  type ProjectColumnReorderError,
  validateProjectColumnSortOrders,
} from './project-column-order';

function slugifyKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

@Component({
  selector: 'app-project-settings-columns-tab',
  imports: [
    NgIcon,
    CdkDrag,
    CdkDropList,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
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
  templateUrl: './project-settings-columns-tab.component.html',
  styleUrl: './project-settings-columns-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectSettingsColumnsTabComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly savingSettings = signal(false);
  readonly reordering = signal(false);
  readonly error = signal<string | null>(null);
  readonly reorderErrors = signal<ProjectColumnReorderError[]>([]);
  readonly columns = signal<ProjectColumnDto[]>([]);
  readonly availableColumns = signal<TenantColumnDto[]>([]);
  readonly deletingColumnId = signal<string | null>(null);
  readonly editingColumnId = signal<string | null>(null);
  readonly showAddForm = signal(false);
  readonly addSubmitted = signal(false);
  readonly editSubmitted = signal(false);
  readonly selectedTenantColumnId = signal<string | null>(null);
  readonly settings = signal<ProjectSettingsDto | null>(null);
  readonly defaultTaskColumnId = signal<string | null>(null);
  readonly settingsSubmitted = signal(false);

  readonly canSaveSettings = computed(() => {
    return !this.savingSettings() && !!this.defaultTaskColumnId();
  });

  readonly addModel = signal({
    key: '',
    title: '',
    description: '',
  });

  readonly editModel = signal({
    title: '',
    description: '',
  });

  readonly canCreateColumn = computed(() => {
    const model = this.addModel();
    return (
      !this.saving() &&
      model.title.trim().length > 0 &&
      slugifyKey(model.key).length > 0
    );
  });

  readonly canSaveEdit = computed(() => {
    const model = this.editModel();
    return !this.saving() && model.title.trim().length > 0;
  });

  readonly canAddFromWorkspace = computed(() => {
    return !this.saving() && !!this.selectedTenantColumnId();
  });

  private projectId: string | null = null;

  ngOnInit(): void {
    void this.loadColumns();
  }

  canDelete(column: ProjectColumnDto): boolean {
    return !column.isRequired;
  }

  toggleAddForm(): void {
    this.showAddForm.update((value) => !value);
    if (this.showAddForm()) {
      this.editingColumnId.set(null);
      this.addModel.set({ key: '', title: '', description: '' });
      this.addSubmitted.set(false);
      this.selectedTenantColumnId.set(this.availableColumns()[0]?.id ?? null);
      this.error.set(null);
    }
  }

  updateAddField(field: 'key' | 'title' | 'description', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.addModel.update((model) => ({ ...model, [field]: value }));
  }

  onAddTitleInput(event: Event): void {
    const title = (event.target as HTMLInputElement).value;
    this.addModel.update((model) => ({
      ...model,
      title,
      key: model.key.trim().length > 0 ? model.key : slugifyKey(title),
    }));
  }

  onAvailableColumnChange(value: string | null): void {
    this.selectedTenantColumnId.set(value);
  }

  onDefaultTaskColumnChange(value: string | null): void {
    this.defaultTaskColumnId.set(value);
  }

  async saveSettings(event: Event): Promise<void> {
    event.preventDefault();
    this.settingsSubmitted.set(true);

    const columnId = this.defaultTaskColumnId();
    if (!this.projectId || !columnId || !this.canSaveSettings()) {
      return;
    }

    this.savingSettings.set(true);
    this.error.set(null);
    try {
      const updated = await this.projectsService.updateSettings(this.projectId, {
        defaultTaskColumnId: columnId,
      });
      this.settings.set(updated);
      this.defaultTaskColumnId.set(updated.defaultTaskColumnId);
      this.settingsSubmitted.set(false);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.savingSettings.set(false);
    }
  }

  defaultColumnLabel = (columnId: string | null): string => {
    if (!columnId) {
      return '';
    }

    return this.columns().find((column) => column.id === columnId)?.title ?? '';
  };

  async addColumn(event: Event): Promise<void> {
    event.preventDefault();
    this.addSubmitted.set(true);
    if (!this.projectId || !this.canCreateColumn()) {
      return;
    }

    const model = this.addModel();
    this.saving.set(true);
    this.error.set(null);
    this.reorderErrors.set([]);
    try {
      const created = await this.projectsService.createColumn(this.projectId, {
        key: slugifyKey(model.key),
        title: model.title.trim(),
        description: model.description.trim() || null,
      });
      this.columns.update((items) =>
        [...items, created].sort(
          (left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title),
        ),
      );
      this.showAddForm.set(false);
      this.addModel.set({ key: '', title: '', description: '' });
      this.addSubmitted.set(false);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.saving.set(false);
    }
  }

  async addColumnFromWorkspace(): Promise<void> {
    const tenantColumnId = this.selectedTenantColumnId();
    if (!this.projectId || !tenantColumnId || !this.canAddFromWorkspace()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.reorderErrors.set([]);
    try {
      const created = await this.projectsService.createColumn(this.projectId, { tenantColumnId });
      this.columns.update((items) =>
        [...items, created].sort(
          (left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title),
        ),
      );
      await this.refreshAvailableColumns();
      this.showAddForm.set(false);
      this.selectedTenantColumnId.set(this.availableColumns()[0]?.id ?? null);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.saving.set(false);
    }
  }

  startEdit(column: ProjectColumnDto): void {
    this.showAddForm.set(false);
    this.editingColumnId.set(column.id);
    this.editModel.set({
      title: column.title,
      description: column.description ?? '',
    });
    this.editSubmitted.set(false);
    this.error.set(null);
    this.reorderErrors.set([]);
  }

  cancelEdit(): void {
    this.editingColumnId.set(null);
    this.editSubmitted.set(false);
  }

  updateEditField(field: 'title' | 'description', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.editModel.update((model) => ({ ...model, [field]: value }));
  }

  async saveEdit(event: Event): Promise<void> {
    event.preventDefault();
    const columnId = this.editingColumnId();
    if (!columnId || !this.projectId) {
      return;
    }

    this.editSubmitted.set(true);
    if (!this.canSaveEdit()) {
      return;
    }

    const model = this.editModel();
    this.saving.set(true);
    this.error.set(null);
    this.reorderErrors.set([]);
    try {
      const updated = await this.projectsService.updateColumn(this.projectId, columnId, {
        title: model.title.trim(),
        description: model.description.trim() || null,
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

  async deleteColumn(column: ProjectColumnDto): Promise<void> {
    if (!this.canDelete(column) || !this.projectId) {
      return;
    }

    if (!confirm(`Remove column "${column.title}" from this project?`)) {
      return;
    }

    this.deletingColumnId.set(column.id);
    this.error.set(null);
    this.reorderErrors.set([]);
    try {
      await this.projectsService.deleteColumn(this.projectId, column.id);
      const remaining = this.columns().filter((item) => item.id !== column.id);
      this.columns.set(remaining);
      if (this.defaultTaskColumnId() === column.id) {
        const nextColumn = remaining[0];
        this.defaultTaskColumnId.set(nextColumn?.id ?? null);
      }
      if (this.editingColumnId() === column.id) {
        this.editingColumnId.set(null);
      }
      await this.refreshAvailableColumns();
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.deletingColumnId.set(null);
    }
  }

  async onColumnDrop(event: CdkDragDrop<ProjectColumnDto[]>): Promise<void> {
    if (!this.projectId || event.previousIndex === event.currentIndex) {
      return;
    }

    const items = [...this.columns()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);

    const sortOrders = computeProjectColumnSortOrders(items);
    const validationErrors = validateProjectColumnSortOrders(items, sortOrders);
    if (validationErrors.length > 0) {
      this.reorderErrors.set(validationErrors);
      this.error.set(null);
      return;
    }

    this.reorderErrors.set([]);
    this.reordering.set(true);
    this.error.set(null);
    try {
      const reordered = await this.projectsService.reorderColumns(this.projectId, {
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

  formatPosition(position: number): string {
    return formatSortOrder(position);
  }

  private async loadColumns(): Promise<void> {
    const code = this.route.parent?.snapshot.paramMap.get('projectCode')?.trim() ?? '';
    if (!code) {
      this.loading.set(false);
      this.error.set('Project was not found.');
      this.columns.set([]);
      this.availableColumns.set([]);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.reorderErrors.set([]);
    try {
      const project = await this.projectsService.getByCode(code);
      if (!project) {
        this.error.set('Project was not found.');
        this.columns.set([]);
        this.availableColumns.set([]);
        this.projectId = null;
        return;
      }

      this.projectId = project.id;
      const [columns, available, settings] = await Promise.all([
        this.projectsService.listColumns(project.id),
        this.projectsService.listAvailableColumns(project.id),
        this.projectsService.getSettings(project.id),
      ]);
      this.columns.set(columns);
      this.availableColumns.set(available);
      this.settings.set(settings);
      this.defaultTaskColumnId.set(settings.defaultTaskColumnId);
      this.selectedTenantColumnId.set(available[0]?.id ?? null);
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
      this.columns.set([]);
      this.availableColumns.set([]);
      this.projectId = null;
    } finally {
      this.loading.set(false);
    }
  }

  private async refreshAvailableColumns(): Promise<void> {
    if (!this.projectId) {
      this.availableColumns.set([]);
      return;
    }

    this.availableColumns.set(await this.projectsService.listAvailableColumns(this.projectId));
    if (!this.availableColumns().some((column) => column.id === this.selectedTenantColumnId())) {
      this.selectedTenantColumnId.set(this.availableColumns()[0]?.id ?? null);
    }
  }
}
