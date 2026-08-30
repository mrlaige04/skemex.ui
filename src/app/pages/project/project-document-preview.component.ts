import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  OnDestroy,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRotateCcw, lucideZoomIn, lucideZoomOut } from '@ng-icons/lucide';
import { renderAsync } from 'docx-preview';
import { firstValueFrom } from 'rxjs';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import { apiConfig, type ApiConfig } from '../../config/api.config';
import type { ProjectDocumentDto } from '../../models/projects/projects.models';
import {
  resolveAbsoluteDownloadUrl,
  resolveDocumentPreviewKind,
  type DocumentPreviewKind,
} from './document-preview.utils';

@Component({
  selector: 'app-project-document-preview',
  imports: [NgIcon, ...HlmButtonImports, ...HlmIconImports],
  providers: [provideIcons({ lucideZoomIn, lucideZoomOut, lucideRotateCcw })],
  templateUrl: './project-document-preview.component.html',
  styleUrl: './project-document-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-h-0 flex-1',
  },
})
export class ProjectDocumentPreviewComponent implements OnDestroy {
  readonly document = input.required<ProjectDocumentDto>();
  readonly active = input(false);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly api = inject<ApiConfig>(apiConfig);

  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly previewKind = signal<DocumentPreviewKind>('unsupported');
  readonly pdfViewerUrl = signal<SafeResourceUrl | null>(null);
  readonly imageUrl = signal<string | null>(null);
  readonly textContent = signal<string | null>(null);
  readonly docxZoom = signal(100);

  private readonly docxBodyRef = viewChild<ElementRef<HTMLElement>>('docxBody');
  private readonly docxStylesRef = viewChild<ElementRef<HTMLElement>>('docxStyles');

  private objectUrl: string | null = null;
  private pdfObjectUrl: string | null = null;
  private loadGeneration = 0;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    effect(() => {
      const active = this.active();
      const document = this.document();

      if (!active) {
        this.loadGeneration += 1;
        this.resetPreview();
        return;
      }

      const downloadUrl = document.downloadUrl?.trim();
      if (!downloadUrl) {
        this.resetPreview();
        this.error.set('Download URL is not available for this document.');
        return;
      }

      const kind = resolveDocumentPreviewKind(document.fileName, document.contentType);

      if (kind === 'unsupported') {
        this.resetPreview();
        this.error.set('Preview is not available for this file type.');
        return;
      }

      this.error.set(null);
      this.loading.set(true);
      this.docxZoom.set(100);
      this.previewKind.set(kind);
      this.pdfViewerUrl.set(null);
      this.imageUrl.set(null);
      this.textContent.set(null);
      this.docxBodyRef()?.nativeElement.replaceChildren();
      this.docxStylesRef()?.nativeElement.replaceChildren();
      const generation = ++this.loadGeneration;

      afterNextRender(
        () => {
          if (generation !== this.loadGeneration || !this.active()) {
            return;
          }

          void this.loadPreview(downloadUrl, kind, generation);
        },
        { injector: this.injector },
      );
    });
  }

  ngOnDestroy(): void {
    this.resetPreview();
  }

  zoomDocxOut(): void {
    this.docxZoom.update((value) => Math.max(50, value - 10));
  }

  zoomDocxIn(): void {
    this.docxZoom.update((value) => Math.min(200, value + 10));
  }

  resetDocxZoom(): void {
    this.docxZoom.set(100);
  }

  private async loadPreview(
    downloadUrl: string,
    kind: DocumentPreviewKind,
    generation: number,
  ): Promise<void> {
    await this.waitForLayout();
    if (generation !== this.loadGeneration || !this.active()) {
      return;
    }

    try {
      if (kind === 'image') {
        const absoluteUrl = resolveAbsoluteDownloadUrl(downloadUrl, this.api.url);
        this.revokeObjectUrl();
        this.objectUrl = absoluteUrl;
        this.imageUrl.set(absoluteUrl);
        this.loading.set(false);
        return;
      }

      const blob = await this.fetchFileBlob(downloadUrl);
      if (generation !== this.loadGeneration || !this.active()) {
        return;
      }

      switch (kind) {
        case 'pdf':
          this.setPdfViewer(blob);
          this.loading.set(false);
          break;
        case 'docx':
          await this.renderDocx(blob, generation);
          break;
        case 'text':
          this.textContent.set(await blob.text());
          this.loading.set(false);
          break;
        default:
          this.error.set('Preview is not available for this file type.');
          this.loading.set(false);
      }
    } catch (err) {
      if (generation !== this.loadGeneration) {
        return;
      }

      this.loading.set(false);
      this.error.set(this.describeFetchError(err));
    }
  }

  private setPdfViewer(blob: Blob): void {
    this.revokePdfUrl();
    const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
    this.pdfObjectUrl = URL.createObjectURL(pdfBlob);
    this.pdfViewerUrl.set(
      this.sanitizer.bypassSecurityTrustResourceUrl(`${this.pdfObjectUrl}#toolbar=1&navpanes=0`),
    );
  }

  private async renderDocx(blob: Blob, generation: number): Promise<void> {
    const body = this.docxBodyRef()?.nativeElement;
    const styles = this.docxStylesRef()?.nativeElement;
    if (!body || !styles) {
      throw new Error('DOCX preview container is not ready.');
    }

    body.replaceChildren();
    styles.replaceChildren();

    await renderAsync(blob, body, styles, {
      className: 'docx-preview-content',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
    });

    if (generation !== this.loadGeneration) {
      body.replaceChildren();
      styles.replaceChildren();
      return;
    }

    this.loading.set(false);
  }

  private async fetchFileBlob(downloadUrl: string): Promise<Blob> {
    const absoluteUrl = resolveAbsoluteDownloadUrl(downloadUrl, this.api.url);
    return firstValueFrom(
      this.http.get(absoluteUrl, {
        responseType: 'blob',
      }),
    );
  }

  private describeFetchError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'Could not reach the file server. Check your connection and try again.';
      }

      return `Could not load document (${err.status}).`;
    }

    return err instanceof Error ? err.message : 'Could not load document preview.';
  }

  private async waitForLayout(): Promise<void> {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    }
  }

  private resetPreview(): void {
    this.loading.set(false);
    this.error.set(null);
    this.previewKind.set('unsupported');
    this.pdfViewerUrl.set(null);
    this.imageUrl.set(null);
    this.textContent.set(null);
    this.docxZoom.set(100);
    this.docxBodyRef()?.nativeElement.replaceChildren();
    this.docxStylesRef()?.nativeElement.replaceChildren();
    this.revokeObjectUrl();
    this.revokePdfUrl();
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.objectUrl);
    }

    this.objectUrl = null;
  }

  private revokePdfUrl(): void {
    if (this.pdfObjectUrl) {
      URL.revokeObjectURL(this.pdfObjectUrl);
      this.pdfObjectUrl = null;
    }
  }
}
