import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideLoaderCircle,
  lucideSearch,
  lucideUploadCloud,
} from '@ng-icons/lucide';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { problemDetailMessage, isTransientHttpFailure } from '../../http/problem-details';
import type { ProjectDocumentDto } from '../../models/projects/projects.models';
import { projectSectionPath } from '../../routing/app-paths';
import { ProjectsService } from '../../services/projects/projects.service';
import { ProjectDocumentsTableActionsCellComponent } from './project-documents-table-actions-cell.component';
import {
  PROJECT_DOCUMENTS_TABLE_HOST,
  type ProjectDocumentsTableHost,
} from './project-documents-table-host';
import {
  RichTableComponent,
  type RichTableColumn,
  type RichTablePaginationChange,
} from '../../shared/rich-table';

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso?: string): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function personName(user: ProjectDocumentDto['uploadedBy']): string {
  const full = `${user.firstName} ${user.lastName}`.trim();
  return full || user.email || '—';
}

function formatVectorizationStatus(status?: string | null): string {
  switch (status) {
    case 'Pending':
      return 'Pending';
    case 'Processing':
      return 'Processing';
    case 'Ready':
      return 'Ready';
    case 'Failed':
      return 'Failed';
    case 'Skipped':
      return 'Skipped';
    default:
      return status?.trim() || '—';
  }
}

@Component({
  selector: 'app-project-documents-page',
  imports: [
    NgIcon,
    RichTableComponent,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
  ],
  providers: [
    provideIcons({ lucideLoaderCircle, lucideSearch, lucideUploadCloud }),
    { provide: PROJECT_DOCUMENTS_TABLE_HOST, useExisting: ProjectDocumentsPageComponent },
  ],
  templateUrl: './project-documents-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0 overflow-y-auto' },
})
export class ProjectDocumentsPageComponent implements OnInit, ProjectDocumentsTableHost {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly listError = signal<string | null>(null);
  readonly uploadError = signal<string | null>(null);
  readonly documents = signal<ProjectDocumentDto[]>([]);
  readonly searchInput = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly deletingId = signal<string | null>(null);
  readonly dragActive = signal(false);
  readonly projectCode = signal('');

  private projectId: string | null = null;
  private dragDepth = 0;
  private pagingEnabled = false;
  private suppressPagingEffect = false;

  readonly tableColumns: RichTableColumn<ProjectDocumentDto>[] = [
    {
      key: 'fileName',
      label: 'Name',
      accessorFn: (row) => row.fileName,
      render: (row) => `<span class="font-medium">${escapeHtml(row.fileName)}</span>`,
      enableHiding: false,
    },
    {
      key: 'size',
      label: 'Size',
      render: (row) =>
        `<span class="text-muted-foreground text-sm">${escapeHtml(formatFileSize(row.fileSizeBytes))}</span>`,
    },
    {
      key: 'uploadedBy',
      label: 'Uploaded by',
      render: (row) =>
        `<span class="text-muted-foreground text-sm">${escapeHtml(personName(row.uploadedBy))}</span>`,
    },
    {
      key: 'createdAt',
      label: 'Uploaded',
      render: (row) =>
        `<span class="text-muted-foreground text-sm">${escapeHtml(formatDate(row.createdAt))}</span>`,
    },
    {
      key: 'vectorizationStatus',
      label: 'RAG status',
      render: (row) =>
        `<span class="text-muted-foreground text-sm">${escapeHtml(formatVectorizationStatus(row.vectorizationStatus))}</span>`,
    },
    {
      key: 'actions',
      label: 'Actions',
      header: '<div class="text-right">Actions</div>',
      component: ProjectDocumentsTableActionsCellComponent,
      enableHiding: false,
    },
  ];

  constructor() {
    effect(() => {
      this.currentPage();
      this.pageSize();
      if (!this.pagingEnabled || this.suppressPagingEffect || !this.projectId) {
        return;
      }
      void this.refreshList();
    });
  }

  ngOnInit(): void {
    void this.loadProject();

    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentPage.set(1);
        void this.refreshList();
      });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchInput.set(value);
    this.search$.next(value);
  }

  onPaginationChange(change: RichTablePaginationChange): void {
    this.currentPage.set(change.pageNumber);
    this.pageSize.set(change.page);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    void this.uploadFile(file);
  }

  onBrowseClick(fileInput: HTMLInputElement): void {
    if (this.uploading() || this.loading()) {
      return;
    }
    fileInput.click();
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.uploading() || this.loading()) {
      return;
    }
    this.dragDepth += 1;
    this.dragActive.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) {
      this.dragActive.set(false);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragDepth = 0;
    this.dragActive.set(false);
    if (this.uploading() || this.loading()) {
      return;
    }

    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }
    void this.uploadFile(file);
  }

  async deleteDocument(document: ProjectDocumentDto): Promise<void> {
    if (!this.projectId || this.deletingId()) {
      return;
    }

    this.deletingId.set(document.id);
    this.listError.set(null);
    try {
      await this.projectsService.deleteDocument(this.projectId, document.id);
      await this.refreshList();
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.deletingId.set(null);
    }
  }

  documentDetailsLink(documentId: string): string[] {
    const code = this.projectCode();
    return code ? projectSectionPath(code, `documents/${documentId}`) : ['/'];
  }

  private async uploadFile(file: File): Promise<void> {
    if (!this.projectId || this.uploading()) {
      return;
    }

    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      this.uploadError.set('Only PDF, DOCX, PNG, and JPG files are allowed.');
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      this.uploadError.set('File size cannot exceed 25 MB.');
      return;
    }

    this.uploading.set(true);
    this.uploadError.set(null);
    try {
      await this.projectsService.uploadDocument(this.projectId, file);
      this.currentPage.set(1);
      await this.refreshList();
    } catch (err) {
      this.uploadError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.uploading.set(false);
    }
  }

  private async loadProject(): Promise<void> {
    const code = this.route.parent?.snapshot.paramMap.get('projectCode')?.trim() ?? '';
    if (!code) {
      this.loading.set(false);
      this.listError.set('Project was not found.');
      return;
    }

    this.loading.set(true);
    this.listError.set(null);
    try {
      const project = await this.projectsService.getByCode(code);
      if (!project) {
        this.listError.set('Project was not found.');
        this.projectId = null;
        return;
      }

      this.projectId = project.id;
      this.projectCode.set(code);
      this.pagingEnabled = true;
      await this.refreshList();
    } catch (err) {
      if (!isTransientHttpFailure(err)) {
        this.listError.set(problemDetailMessage(err as HttpErrorResponse));
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async refreshList(): Promise<void> {
    if (!this.projectId) {
      return;
    }

    this.suppressPagingEffect = true;
    try {
      const page = await this.projectsService.listDocuments(
        this.projectId,
        this.searchInput(),
        this.currentPage(),
        this.pageSize(),
      );
      this.documents.set(page.items);
      this.totalItems.set(page.totalItems);
      this.currentPage.set(page.pageNumber);
      this.pageSize.set(page.pageSize);
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
      this.documents.set([]);
      this.totalItems.set(0);
    } finally {
      this.suppressPagingEffect = false;
    }
  }
}
