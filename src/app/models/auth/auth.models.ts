export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AccessTokenResponse {
  accessToken: string;
  tokenType: string;
  refreshToken?: string | null;
}

export interface RefreshTokenRequest {
  accessToken: string;
  refreshToken: string;
}

export interface TenantSummary {
  id: string;
  name: string;
}

export interface CurrentUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSuperAdmin: boolean;
  avatarUrl?: string | null;
  tenants: TenantSummary[];
  roles: unknown[];
  permissions: unknown[];
}

export interface LoginResponse {
  token: AccessTokenResponse;
  user: CurrentUserResponse;
}

export interface RegisterResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface TenantSessionResponse {
  token: AccessTokenResponse;
  tenantId: string;
  tenantName: string;
  roles: unknown[];
  permissions: unknown[];
}

/** Browser session snapshot after a workspace is selected (sidebar + guards). */
export interface TenantWorkspaceContext {
  tenantId: string;
  tenantName: string;
  userEmail: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  /** Workspaces the user belongs to (for switching); prefer stable {@link TenantSummary#id} in URLs. */
  tenants: TenantSummary[];
}

export interface UpdateUserProfileResponse {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

/** Current user from <code>GET api/auth/me</code> (profile editor prefill). */
export interface CurrentUserProfileDto {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
}

export interface CreateTenantRequest {
  name: string;
  email: string;
}
