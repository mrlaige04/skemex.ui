import { InjectionToken } from '@angular/core';
import type { ProjectDocumentDto } from '../../models/projects/projects.models';

export interface ProjectDocumentsTableHost {
  deletingId(): string | null;
  deleteDocument(document: ProjectDocumentDto): Promise<void>;
  documentDetailsLink(documentId: string): string[];
}

export const PROJECT_DOCUMENTS_TABLE_HOST = new InjectionToken<ProjectDocumentsTableHost>(
  'PROJECT_DOCUMENTS_TABLE_HOST',
);
