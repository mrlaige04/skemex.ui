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

  execute(body: ExecuteAiRequest, files: File[] = []): Promise<AiAgentJobDto> {
    const hasArtefacts = (body.artefacts?.length ?? 0) > 0;
    if (files.length === 0 && !hasArtefacts) {
      return firstValueFrom(this.api.post<ExecuteAiRequest, AiAgentJobDto>('api/ai/execute', body));
    }

    if (files.length === 0) {
      return firstValueFrom(this.api.post<ExecuteAiRequest, AiAgentJobDto>('api/ai/execute', body));
    }

    const form = new FormData();
    if (body.projectId) {
      form.append('projectId', body.projectId);
    }
    if (body.chatId) {
      form.append('chatId', body.chatId);
    }
    form.append('userInput', body.userInput ?? '');
    if (body.model) {
      form.append('model', body.model);
    }
    if (body.source) {
      form.append('source', body.source);
    }
    if (body.toolName) {
      form.append('toolName', body.toolName);
    }
    if (body.argumentsJson) {
      form.append('argumentsJson', body.argumentsJson);
    }
    if (hasArtefacts) {
      form.append('artefactsJson', JSON.stringify(body.artefacts));
    }
    for (const file of files) {
      form.append('files', file, file.name);
    }

    return firstValueFrom(this.api.postFormData<AiAgentJobDto>('api/ai/execute', form));
  }

  getExecution(jobId: string): Promise<AiAgentJobDto> {
    return firstValueFrom(this.api.get<AiAgentJobDto>(`api/ai/execute/${jobId}`));
  }
}
