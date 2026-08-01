import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { AiModelDto } from '../../models/ai-chat/ai-chat.models';
import { BaseHttp } from '../http/base-http.service';

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly api = inject(BaseHttp);

  listAiModels(refresh = false): Promise<AiModelDto[]> {
    return firstValueFrom(
      this.api.get<AiModelDto[]>('api/ai/models', { refresh }),
    );
  }
}
