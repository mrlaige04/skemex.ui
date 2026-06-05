import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type {
  AcceptTenantInvitationRequest,
  AcceptTenantInvitationResponse,
  CreateTenantRequest,
  CurrentUserProfileDto,
  CurrentUserResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RequestPasswordResetRequest,
  RequestPasswordResetResponse,
  ResetPasswordWithCodeRequest,
  ResetPasswordWithCodeResponse,
  TenantInvitationPreview,
  TenantSessionResponse,
  TenantSummary,
  TenantWorkspaceContext,
  UpdateUserProfileResponse,
} from '../../models/auth/auth.models';
import { BaseHttp } from '../http/base-http.service';
import { AuthTokenStore } from './auth-token.store';

const PENDING_TENANT_USER_KEY = 'skemex.sx.tu';
const WORKSPACE_CONTEXT_KEY = 'skemex.sx.ws';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly api = inject(BaseHttp);
  private readonly router = inject(Router);
  private readonly tokens = inject(AuthTokenStore);

  /** Mirrors stored access token (signal); safe to use from templates or interceptors via store. */
  readonly accessToken = this.tokens.accessToken;

  private readonly _workspaceContext = signal<TenantWorkspaceContext | null>(null);

  /** Current tenant workspace (after {@link selectTenant}); cleared on logout. */
  readonly workspaceContext = this._workspaceContext.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this._workspaceContext.set(this.readWorkspaceContextFromStorage());
    }
  }

  login(body: LoginRequest): Promise<LoginResponse> {
    return firstValueFrom(
      this.api.post<LoginRequest, LoginResponse>('api/auth/login', body),
    ).then(async (res) => {
      if (!res?.token?.accessToken) {
        throw new Error('Login response did not include an access token.');
      }
      await this.tokens.persistFromAccessTokenResponse(res.token);
      this.setPendingTenantSelection(res.user);
      return res;
    });
  }

  register(body: RegisterRequest): Promise<RegisterResponse> {
    return firstValueFrom(this.api.post<RegisterRequest, RegisterResponse>('api/auth/register', body));
  }

  getInvitation(token: string): Promise<TenantInvitationPreview> {
    const encoded = encodeURIComponent(token.trim());
    return firstValueFrom(this.api.get<TenantInvitationPreview>(`api/auth/invitations/${encoded}`));
  }

  acceptInvitation(body: AcceptTenantInvitationRequest): Promise<AcceptTenantInvitationResponse> {
    return firstValueFrom(
      this.api.post<AcceptTenantInvitationRequest, AcceptTenantInvitationResponse>(
        'api/auth/invitations/accept',
        body,
      ),
    );
  }

  requestPasswordReset(body: RequestPasswordResetRequest): Promise<RequestPasswordResetResponse> {
    return firstValueFrom(
      this.api.post<RequestPasswordResetRequest, RequestPasswordResetResponse>(
        'api/auth/password-reset/request',
        body,
      ),
    );
  }

  resetPasswordWithCode(body: ResetPasswordWithCodeRequest): Promise<ResetPasswordWithCodeResponse> {
    return firstValueFrom(
      this.api.post<ResetPasswordWithCodeRequest, ResetPasswordWithCodeResponse>(
        'api/auth/password-reset/confirm',
        body,
      ),
    );
  }

  /** Snapshot of user + tenant list until a workspace is selected (sessionStorage + login). */
  setPendingTenantSelection(user: CurrentUserResponse): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    sessionStorage.setItem(PENDING_TENANT_USER_KEY, JSON.stringify(user));
  }

  getPendingTenantSelection(): CurrentUserResponse | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const raw = sessionStorage.getItem(PENDING_TENANT_USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as CurrentUserResponse;
    } catch {
      sessionStorage.removeItem(PENDING_TENANT_USER_KEY);
      return null;
    }
  }

  clearPendingTenantSelection(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    sessionStorage.removeItem(PENDING_TENANT_USER_KEY);
  }

  async selectTenant(tenantId: string): Promise<void> {
    const pending = this.getPendingTenantSelection();
    const prev = this._workspaceContext();
    const res = await firstValueFrom(
      this.api.post<{ tenantId: string }, TenantSessionResponse>('api/auth/tenant', { tenantId }),
    );
    await this.tokens.persistFromAccessTokenResponse(res.token);
    const fromPending = pending?.tenants;
    let tenants = fromPending ?? prev?.tenants ?? [];
    if (tenants.length === 0) {
      tenants = [{ id: res.tenantId, name: res.tenantName }];
    } else {
      tenants = tenants.map((t) => (t.id === res.tenantId ? { ...t, name: res.tenantName } : t));
      if (!tenants.some((t) => t.id === res.tenantId)) {
        tenants = [...tenants, { id: res.tenantId, name: res.tenantName }];
      }
    }
    this.persistWorkspaceContext({
      tenantId: res.tenantId,
      tenantName: res.tenantName,
      userEmail: pending?.email ?? prev?.userEmail ?? '',
      firstName: pending?.firstName ?? prev?.firstName ?? '',
      lastName: pending?.lastName ?? prev?.lastName ?? '',
      avatarUrl: pending?.avatarUrl ?? prev?.avatarUrl ?? null,
      tenants,
    });
    this.clearPendingTenantSelection();
  }

  /** Loads first/last name and email from the API (authoritative prefill for the profile page). */
  getMyProfile(): Promise<CurrentUserProfileDto> {
    return firstValueFrom(this.api.get<CurrentUserProfileDto>('api/auth/me'));
  }

  updateProfile(body: {
    firstName?: string;
    lastName?: string;
    image?: File | null;
  }): Promise<UpdateUserProfileResponse> {
    const fd = new FormData();
    if (body.firstName !== undefined && body.firstName.trim() !== '') {
      fd.append('firstName', body.firstName.trim());
    }
    if (body.lastName !== undefined && body.lastName.trim() !== '') {
      fd.append('lastName', body.lastName.trim());
    }
    if (body.image && body.image.size > 0) {
      fd.append('image', body.image, body.image.name);
    }
    return firstValueFrom(this.api.patchFormData<UpdateUserProfileResponse>('api/auth/profile', fd)).then(
      (res) => {
        this.patchWorkspaceProfile({
          firstName: res.firstName,
          lastName: res.lastName,
          avatarUrl: res.avatarUrl ?? null,
        });
        return res;
      },
    );
  }

  /** Removes the profile photo via <code>DELETE api/auth/profile-image</code>. */
  deleteProfileImage(): Promise<UpdateUserProfileResponse> {
    return firstValueFrom(this.api.delete<UpdateUserProfileResponse>('api/auth/profile-image')).then(
      (res) => {
        this.patchWorkspaceProfile({
          firstName: res.firstName,
          lastName: res.lastName,
          avatarUrl: res.avatarUrl ?? null,
        });
        return res;
      },
    );
  }

  /** Updates the cached workspace profile fields (e.g. after {@link updateProfile}). */
  patchWorkspaceProfile(
    partial: Partial<Pick<TenantWorkspaceContext, 'firstName' | 'lastName' | 'avatarUrl'>>,
  ): void {
    const cur = this._workspaceContext();
    if (!cur) {
      return;
    }
    this.persistWorkspaceContext({ ...cur, ...partial });
  }

  async createTenant(body: CreateTenantRequest): Promise<TenantSummary> {
    const created = await firstValueFrom(
      this.api.post<CreateTenantRequest, TenantSummary>('api/tenants', body),
    );
    const pending = this.getPendingTenantSelection();
    if (pending) {
      const tenants = [...pending.tenants, created];
      this.setPendingTenantSelection({ ...pending, tenants });
    }
    return created;
  }

  logout(): void {
    this.clearPendingTenantSelection();
    this.clearWorkspaceContext();
    this.tokens.clear();
    void this.router.navigate(['/auth', 'login']);
  }

  private persistWorkspaceContext(ctx: TenantWorkspaceContext): void {
    this._workspaceContext.set(ctx);
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      sessionStorage.setItem(WORKSPACE_CONTEXT_KEY, JSON.stringify(ctx));
    } catch {
      /* ignore quota / private mode */
    }
  }

  private clearWorkspaceContext(): void {
    this._workspaceContext.set(null);
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    sessionStorage.removeItem(WORKSPACE_CONTEXT_KEY);
  }

  private readWorkspaceContextFromStorage(): TenantWorkspaceContext | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const raw = sessionStorage.getItem(WORKSPACE_CONTEXT_KEY);
    if (!raw) {
      return null;
    }
    try {
      const o = JSON.parse(raw) as TenantWorkspaceContext;
      if (typeof o.tenantId !== 'string' || typeof o.tenantName !== 'string') {
        return null;
      }
      let tenants = Array.isArray(o.tenants)
        ? (o.tenants as TenantSummary[]).filter((t) => t && typeof t.id === 'string' && typeof t.name === 'string')
        : [];
      if (tenants.length === 0) {
        tenants = [{ id: o.tenantId, name: o.tenantName }];
      }
      return {
        tenantId: o.tenantId,
        tenantName: o.tenantName,
        userEmail: typeof o.userEmail === 'string' ? o.userEmail : '',
        firstName: typeof o.firstName === 'string' ? o.firstName : '',
        lastName: typeof o.lastName === 'string' ? o.lastName : '',
        avatarUrl: o.avatarUrl === null || typeof o.avatarUrl === 'string' ? o.avatarUrl : null,
        tenants,
      };
    } catch {
      sessionStorage.removeItem(WORKSPACE_CONTEXT_KEY);
      return null;
    }
  }
}
