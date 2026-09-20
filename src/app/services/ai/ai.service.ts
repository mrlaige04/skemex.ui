import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { AiAgentJobDto, ExecuteAiRequest } from '../../models/ai-chat/ai-agent.models';
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

  execute(body: ExecuteAiRequest): Promise<AiAgentJobDto> {
    return firstValueFrom(this.api.post<ExecuteAiRequest, AiAgentJobDto>('api/ai/execute', body));
  }

  getExecution(jobId: string): Promise<AiAgentJobDto> {
    return firstValueFrom(this.api.get<AiAgentJobDto>(`api/ai/execute/${jobId}`));
  }
}
