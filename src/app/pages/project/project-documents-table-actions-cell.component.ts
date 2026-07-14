import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  injectFlexRenderContext,
  type CellContext,
} from '@tanstack/angular-table';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideLoaderCircle, lucideTrash2 } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import type { ProjectDocumentDto } from '../../models/projects/projects.models';
import {
  PROJECT_DOCUMENTS_TABLE_HOST,
  type ProjectDocumentsTableHost,
} from './project-documents-table-host';

@Component({
  selector: 'app-project-documents-table-actions-cell',
  imports: [NgIcon, ...HlmButtonImports, ...HlmIconImports],
  providers: [provideIcons({ lucideDownload, lucideLoaderCircle, lucideTrash2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex justify-end gap-2">
      @if (downloadUrl; as url) {
        <a hlmBtn variant="ghost" size="sm" class="h-8 px-2" [href]="url" target="_blank" rel="noopener noreferrer">
          <ng-icon hlm name="lucideDownload" size="sm" />
          Download
        </a>
      }
      <button
        type="button"
        hlmBtn
        variant="ghost"
        size="sm"
        class="text-destructive hover:text-destructive h-8 px-2"
        [disabled]="host.deletingId() === document.id"
        (click)="host.deleteDocument(document)"
      >
        @if (host.deletingId() === document.id) {
          <ng-icon hlm name="lucideLoaderCircle" size="sm" class="animate-spin" />
        } @else {
          <ng-icon hlm name="lucideTrash2" size="sm" />
        }
        Delete
      </button>
    </div>
  `,
})
export class ProjectDocumentsTableActionsCellComponent {
  // Do not wrap ctx.row.original in computed() — FlexRender context is not a signal,
  // so computed would cache the first row forever when the cell instance is reused.
  readonly ctx = injectFlexRenderContext<CellContext<ProjectDocumentDto, unknown>>();
  readonly host = inject<ProjectDocumentsTableHost>(PROJECT_DOCUMENTS_TABLE_HOST);

  get document(): ProjectDocumentDto {
    return this.ctx.row.original;
  }

  get downloadUrl(): string | null {
    return this.document.downloadUrl?.trim() || null;
  }
}
