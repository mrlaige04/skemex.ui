/** Returns true when the JWT is missing, malformed, or past {@code exp} (with optional leeway). */
export function isAccessTokenExpired(accessToken: string, leewaySeconds = 30): boolean {
  const payload = readJwtPayload(accessToken);
  const exp = payload?.['exp'];
  if (!payload || typeof exp !== 'number') {
    return true;
  }
  return Date.now() >= (exp - leewaySeconds) * 1000;
}

export function readJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const parts = accessToken.split('.');
    if (parts.length < 2) {
      return null;
    }
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function claimIsTrue(payload: Record<string, unknown> | null, claim: string): boolean {
  if (!payload) {
    return false;
  }
  const value = payload[claim];
  return value === true || value === 'true';
}

/** Platform super-admin flag from {@code IsSuperAdmin} JWT claim. */
export function isSuperAdminFromToken(accessToken: string | null | undefined): boolean {
  if (!accessToken) {
    return false;
  }
  const payload = readJwtPayload(accessToken);
  return claimIsTrue(payload, 'IsSuperAdmin') || claimIsTrue(payload, 'isSuperAdmin');
}

/** Role names from {@code Roles} JWT claims (and standard role claims). */
export function rolesFromToken(accessToken: string | null | undefined): string[] {
  if (!accessToken) {
    return [];
  }
  const payload = readJwtPayload(accessToken);
  if (!payload) {
    return [];
  }

  const fromRolesClaim = payload['Roles'];
  if (Array.isArray(fromRolesClaim)) {
    return fromRolesClaim.filter((r): r is string => typeof r === 'string');
  }
  if (typeof fromRolesClaim === 'string' && fromRolesClaim.length > 0) {
    return [fromRolesClaim];
  }

  const roleClaim = payload['role'];
  if (typeof roleClaim === 'string') {
    return [roleClaim];
  }
  if (Array.isArray(roleClaim)) {
    return roleClaim.filter((r): r is string => typeof r === 'string');
  }

  return [];
}
