import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BrnDialogContent } from '@spartan-ng/brain/dialog';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideDownload, lucideEye } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmDialogImports } from 'spartan/dialog';
import { HlmIconImports } from 'spartan/icon';
import { problemDetailMessage } from '../../http/problem-details';
import type { ProjectDocumentDto } from '../../models/projects/projects.models';
import { projectSectionPath } from '../../routing/app-paths';
import { ProjectsService } from '../../services/projects/projects.service';
import { ProjectDocumentPreviewComponent } from './project-document-preview.component';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(iso?: string | null): string {
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
  selector: 'app-project-document-page',
  imports: [
    RouterLink,
    BrnDialogContent,
    NgIcon,
    ProjectDocumentPreviewComponent,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmDialogImports,
    ...HlmIconImports,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideDownload, lucideEye })],
  templateUrl: './project-document-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDocumentPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly document = signal<ProjectDocumentDto | null>(null);
  readonly projectCode = signal('');
  readonly documentsListLink = computed(() =>
    this.projectCode() ? projectSectionPath(this.projectCode(), 'documents') : ['/'],
  );

  readonly showRagInfo = computed(() => {
    const status = this.document()?.vectorizationStatus;
    return status !== undefined && status !== 'Skipped';
  });

  readonly previewDialogState = signal<'open' | 'closed'>('closed');

  ngOnInit(): void {
    void this.loadDocument();
  }

  formatFileSize(bytes: number): string {
    return formatFileSize(bytes);
  }

  formatDateTime(iso?: string | null): string {
    return formatDateTime(iso);
  }

  personName(user: ProjectDocumentDto['uploadedBy']): string {
    return personName(user);
  }

  formatVectorizationStatus(status?: string | null): string {
    return formatVectorizationStatus(status);
  }

  openPreview(): void {
    this.previewDialogState.set('open');
  }

  onPreviewDialogStateChanged(state: 'open' | 'closed'): void {
    this.previewDialogState.set(state);
  }

  private async loadDocument(): Promise<void> {
    const projectCode = this.route.parent?.snapshot.paramMap.get('projectCode')?.trim() ?? '';
    const documentId = this.route.snapshot.paramMap.get('documentId')?.trim() ?? '';
    this.projectCode.set(projectCode);

    if (!projectCode || !documentId) {
      this.loadError.set('Document was not found.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);
    try {
      const project = await this.projectsService.getByCode(projectCode);
      if (!project) {
        this.loadError.set('Project was not found.');
        return;
      }

      const document = await this.projectsService.getDocument(project.id, documentId);
      this.document.set(document);
    } catch (err) {
      this.loadError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.loading.set(false);
    }
  }
}
