import { InjectionToken } from '@angular/core';
import type { SaEmailTemplateSummaryDto } from '../../../models/admin/email-templates.models';

export interface EmailTemplatesTableHost {
  editLink(templateId: string): string[];
  displayName(template: SaEmailTemplateSummaryDto): string;
  canDelete(template: SaEmailTemplateSummaryDto): boolean;
  deletingId(): string | null;
  deleteTemplate(template: SaEmailTemplateSummaryDto): void;
}

export const EMAIL_TEMPLATES_TABLE_HOST = new InjectionToken<EmailTemplatesTableHost>(
  'EMAIL_TEMPLATES_TABLE_HOST',
);
