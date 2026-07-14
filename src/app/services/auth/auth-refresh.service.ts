import { HttpBackend, HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, Injector } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiConfig } from '../../config/api.config';
import type { AccessTokenResponse, RefreshTokenRequest } from '../../models/auth/auth.models';
import { isAccessTokenExpired } from '../../utils/jwt.util';
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

  /**
   * Ensures a non-expired access token is available (hydrates storage, refreshes when needed).
   * Returns false only when the session cannot be recovered (caller should redirect to login).
   */
  async ensureValidAccessToken(): Promise<boolean> {
    await this.tokens.whenHydrated;

    const accessToken = this.tokens.accessToken();
    if (!accessToken) {
      return false;
    }

    if (!isAccessTokenExpired(accessToken)) {
      return true;
    }

    return this.tryRefresh();
  }

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
    await this.tokens.whenHydrated;

    const accessToken = this.tokens.accessToken();
    const refreshToken = this.tokens.readRefreshToken();
    if (!accessToken || !refreshToken) {
      this.forceLogout();
      return false;
    }

    const base = this.api.url.replace(/\/$/, '');
    const client = new HttpClient(this.httpBackend);
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    try {
      const body: RefreshTokenRequest = { accessToken, refreshToken };
      const token = await firstValueFrom(
        client.post<AccessTokenResponse>(`${base}/api/auth/refresh`, body, { headers }),
      );

      if (!token?.accessToken) {
        this.forceLogout();
        return false;
      }

      await this.tokens.persistFromAccessTokenResponse(token);
      this.injector.get(AuthService).syncSuperAdminFromToken();
      return true;
    } catch (err) {
      // Only clear the session on definitive auth failure; network blips should not logout.
      if (err instanceof HttpErrorResponse && err.status >= 400 && err.status < 500) {
        this.forceLogout();
      }
      return false;
    }
  }

  private forceLogout(): void {
    this.injector.get(AuthService).logout();
  }
}
