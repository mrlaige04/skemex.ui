import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  IntegrationProviderKey,
  IntegrationStatusDto,
} from '../../models/integrations/integrations.models';
import { BaseHttp } from '../http/base-http.service';

@Injectable({ providedIn: 'root' })
export class ProjectIntegrationsService {
  private readonly api = inject(BaseHttp);

  /** Latest known configured flags per project (provider → configured). */
  private readonly configuredByProject = signal<Record<string, Record<string, boolean>>>({});

  isConfigured(projectId: string | null | undefined, provider: IntegrationProviderKey): boolean {
    if (!projectId) {
      return false;
    }
    return this.configuredByProject()[projectId]?.[provider] === true;
  }

  async getStatus(
    projectId: string,
    provider: IntegrationProviderKey,
  ): Promise<IntegrationStatusDto> {
    const status = await firstValueFrom(
      this.api.get<IntegrationStatusDto>(`api/projects/${projectId}/integrations/status`, {
        provider,
      }),
    );
    this.remember(projectId, status.provider || provider, status.isConfigured);
    return status;
  }

  async refresh(
    projectId: string,
    provider: IntegrationProviderKey = 'jira',
  ): Promise<boolean> {
    const status = await this.getStatus(projectId, provider);
    return status.isConfigured;
  }

  /** Optimistic / post-connect update without waiting for a round-trip. */
  setConfigured(
    projectId: string,
    provider: IntegrationProviderKey,
    configured: boolean,
  ): void {
    this.remember(projectId, provider, configured);
  }

  clearProject(projectId: string): void {
    this.configuredByProject.update((map) => {
      if (!(projectId in map)) {
        return map;
      }
      const next = { ...map };
      delete next[projectId];
      return next;
    });
  }

  private remember(projectId: string, provider: string, configured: boolean): void {
    this.configuredByProject.update((map) => ({
      ...map,
      [projectId]: {
        ...(map[projectId] ?? {}),
        [provider]: configured,
      },
    }));
  }
}
