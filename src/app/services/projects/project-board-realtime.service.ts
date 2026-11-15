import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { apiConfig } from '../../config/api.config';
import { AuthRefreshService } from '../auth/auth-refresh.service';
import { AuthTokenStore } from '../auth/auth-token.store';

export interface ProjectBoardChangedEvent {
  projectId: string;
  changeKind: string;
  taskId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProjectBoardRealtimeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly api = inject(apiConfig);
  private readonly tokens = inject(AuthTokenStore);
  private readonly authRefresh = inject(AuthRefreshService);

  private connection: HubConnection | null = null;
  private joinedProjectId: string | null = null;
  private connectToken = 0;

  private readonly boardChangedSubject = new Subject<ProjectBoardChangedEvent>();
  readonly boardChanged$ = this.boardChangedSubject.asObservable();

  /** Opens (or reuses) the hub connection and joins the project group. */
  async connect(projectId: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const id = projectId.trim();
    if (!id) {
      return;
    }

    const token = ++this.connectToken;

    try {
      await this.ensureConnection();
      if (token !== this.connectToken) {
        return;
      }

      if (this.joinedProjectId === id) {
        return;
      }

      if (this.joinedProjectId) {
        await this.leaveJoinedGroup();
      }

      await this.connection!.invoke('JoinProject', id);
      if (token !== this.connectToken) {
        await this.connection!.invoke('LeaveProject', id).catch(() => undefined);
        return;
      }

      this.joinedProjectId = id;
    } catch {
      // Board still works without live updates; avoid surfacing hub noise.
      this.joinedProjectId = null;
    }
  }

  /** Leaves the project group and stops the hub connection. */
  async disconnect(): Promise<void> {
    this.connectToken += 1;
    const connection = this.connection;
    const projectId = this.joinedProjectId;
    this.joinedProjectId = null;
    this.connection = null;

    if (!connection) {
      return;
    }

    try {
      if (projectId && connection.state === HubConnectionState.Connected) {
        await connection.invoke('LeaveProject', projectId);
      }
    } catch {
      // ignore
    }

    try {
      await connection.stop();
    } catch {
      // ignore
    }
  }

  private async ensureConnection(): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) {
      return;
    }

    if (this.connection) {
      try {
        await this.connection.stop();
      } catch {
        // ignore
      }
      this.connection = null;
    }

    const tokenOk = await this.authRefresh.ensureValidAccessToken();
    if (!tokenOk) {
      throw new Error('Not authenticated.');
    }

    const hubUrl = `${this.api.url.replace(/\/$/, '')}/hubs/project-board`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: async () => {
          await this.authRefresh.ensureValidAccessToken();
          return this.tokens.accessToken() ?? '';
        },
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('boardChanged', (payload: ProjectBoardChangedEvent | null | undefined) => {
      const projectId = payload?.projectId?.trim();
      if (!projectId) {
        return;
      }
      this.boardChangedSubject.next({
        projectId,
        changeKind: payload?.changeKind ?? 'Updated',
        taskId: payload?.taskId ?? null,
      });
    });

    connection.onreconnected(async () => {
      const projectId = this.joinedProjectId;
      if (!projectId) {
        return;
      }
      try {
        await connection.invoke('JoinProject', projectId);
      } catch {
        this.joinedProjectId = null;
      }
    });

    await connection.start();
    this.connection = connection;
  }

  private async leaveJoinedGroup(): Promise<void> {
    const projectId = this.joinedProjectId;
    this.joinedProjectId = null;
    if (!projectId || !this.connection || this.connection.state !== HubConnectionState.Connected) {
      return;
    }

    try {
      await this.connection.invoke('LeaveProject', projectId);
    } catch {
      // ignore
    }
  }
}
