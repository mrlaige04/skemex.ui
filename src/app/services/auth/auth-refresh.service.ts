import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable, Injector } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiConfig } from '../../config/api.config';
import type { AccessTokenResponse, RefreshTokenRequest } from '../../models/auth/auth.models';
import { AuthTokenStore } from './auth-token.store';
import { AuthService } from './auth.service';

/**
 * Calls <code>POST /api/auth/refresh</code> via {@link HttpBackend} so interceptors do not run.
 */
@Injectable({ providedIn: 'root' })
export class AuthRefreshService {
  private readonly httpBackend = inject(HttpBackend);
  private readonly api = inject(apiConfig);
  private readonly tokens = inject(AuthTokenStore);
  private readonly injector = inject(Injector);

  private refreshInFlight: Promise<boolean> | null = null;

  /** Refreshes tokens once; concurrent callers share the same in-flight request. */
  tryRefresh(): Promise<boolean> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.refreshOnce().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  private async refreshOnce(): Promise<boolean> {
    const accessToken = this.tokens.accessToken();
    const refreshToken = this.tokens.readRefreshToken();
    if (!accessToken || !refreshToken) {
      this.forceLogout();
      return false;
    }

    const base = this.api.url.replace(/\/$/, '');
    const client = new HttpClient(this.httpBackend);

    try {
      const body: RefreshTokenRequest = { accessToken, refreshToken };
      const token = await firstValueFrom(
        client.post<AccessTokenResponse>(`${base}/api/auth/refresh`, body),
      );
      await this.tokens.persistFromAccessTokenResponse(token);
      return true;
    } catch {
      this.forceLogout();
      return false;
    }
  }

  private forceLogout(): void {
    this.injector.get(AuthService).logout();
  }
}
