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
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
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

  return collectStringClaims(payload, [
    'Roles',
    'role',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
  ]);
}

/** Permission names from {@code permissions} (space-separated) and legacy {@code permission} claims. */
export function permissionsFromToken(accessToken: string | null | undefined): string[] {
  if (!accessToken) {
    return [];
  }
  const payload = readJwtPayload(accessToken);
  if (!payload) {
    return [];
  }

  const values = new Set<string>();

  const packed = payload['permissions'];
  if (typeof packed === 'string' && packed.length > 0) {
    for (const part of packed.split(/\s+/)) {
      if (part.length > 0) {
        values.add(part);
      }
    }
  } else if (Array.isArray(packed)) {
    for (const item of packed) {
      if (typeof item === 'string' && item.length > 0) {
        values.add(item);
      }
    }
  }

  for (const name of collectStringClaims(payload, ['permission'])) {
    values.add(name);
  }

  return [...values];
}

function collectStringClaims(payload: Record<string, unknown>, keys: string[]): string[] {
  const values = new Set<string>();
  for (const key of keys) {
    const claim = payload[key];
    if (typeof claim === 'string' && claim.length > 0) {
      values.add(claim);
    } else if (Array.isArray(claim)) {
      for (const item of claim) {
        if (typeof item === 'string' && item.length > 0) {
          values.add(item);
        }
      }
    }
  }
  return [...values];
}
