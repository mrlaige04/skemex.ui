import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  CreateSaAiProviderRequest,
  SaAiProviderDto,
  SaAiProviderModelDto,
  UpdateSaAiProviderModelRequest,
  UpdateSaAiProviderRequest,
} from '../../models/admin/ai-providers.models';
import { BaseHttp } from '../http/base-http.service';

@Injectable({ providedIn: 'root' })
export class SaAiProvidersService {
  private readonly api = inject(BaseHttp);

  list(): Promise<SaAiProviderDto[]> {
    return firstValueFrom(this.api.get<SaAiProviderDto[]>('api/sa/ai-providers'));
  }

  get(id: string): Promise<SaAiProviderDto> {
    return firstValueFrom(this.api.get<SaAiProviderDto>(`api/sa/ai-providers/${id}`));
  }

  listModels(providerId: string): Promise<SaAiProviderModelDto[]> {
    return firstValueFrom(
      this.api.get<SaAiProviderModelDto[]>(`api/sa/ai-providers/${providerId}/models`),
    );
  }

  updateModel(
    providerId: string,
    modelId: string,
    body: UpdateSaAiProviderModelRequest,
  ): Promise<SaAiProviderModelDto> {
    return firstValueFrom(
      this.api.patch<UpdateSaAiProviderModelRequest, SaAiProviderModelDto>(
        `api/sa/ai-providers/${providerId}/models/${modelId}`,
        body,
      ),
    );
  }

  create(body: CreateSaAiProviderRequest): Promise<SaAiProviderDto> {
    return firstValueFrom(
      this.api.post<CreateSaAiProviderRequest, SaAiProviderDto>('api/sa/ai-providers', body),
    );
  }

  update(id: string, body: UpdateSaAiProviderRequest): Promise<SaAiProviderDto> {
    return firstValueFrom(
      this.api.put<UpdateSaAiProviderRequest, SaAiProviderDto>(`api/sa/ai-providers/${id}`, body),
    );
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.api.delete<void>(`api/sa/ai-providers/${id}`));
  }
}
