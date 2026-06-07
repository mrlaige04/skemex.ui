import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  SaEmailTemplateDto,
  SaEmailTemplateSummaryDto,
  UpdateSaEmailTemplateRequest,
} from '../../models/admin/email-templates.models';
import { BaseHttp } from '../http/base-http.service';

@Injectable({ providedIn: 'root' })
export class SaEmailTemplatesService {
  private readonly api = inject(BaseHttp);

  list(search?: string): Promise<SaEmailTemplateSummaryDto[]> {
    const params: Record<string, string> = {};
    const term = search?.trim();
    if (term) {
      params['search'] = term;
    }
    return firstValueFrom(this.api.get<SaEmailTemplateSummaryDto[]>('api/sa/email-templates', params));
  }

  get(id: string): Promise<SaEmailTemplateDto> {
    return firstValueFrom(this.api.get<SaEmailTemplateDto>(`api/sa/email-templates/${id}`));
  }

  update(id: string, body: UpdateSaEmailTemplateRequest): Promise<SaEmailTemplateDto> {
    return firstValueFrom(
      this.api.patch<UpdateSaEmailTemplateRequest, SaEmailTemplateDto>(`api/sa/email-templates/${id}`, body),
    );
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.api.delete<void>(`api/sa/email-templates/${id}`));
  }
}
