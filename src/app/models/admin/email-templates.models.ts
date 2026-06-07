export interface SaEmailTemplateSummaryDto {
  id: string;
  title: string;
  type: string;
  subject: string;
  isSystem: boolean;
  tenantId?: string | null;
  tenantName?: string | null;
  scope: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface SaEmailTemplateDto extends SaEmailTemplateSummaryDto {
  body: string;
}

export interface UpdateSaEmailTemplateRequest {
  title?: string;
  subject?: string;
  body?: string;
}
