/** Returns true when the JWT is missing, malformed, or past {@code exp} (with optional leeway). */
export function isAccessTokenExpired(accessToken: string, leewaySeconds = 30): boolean {
  try {
    const parts = accessToken.split('.');
    if (parts.length < 2) {
      return true;
    }
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number };
    if (typeof payload.exp !== 'number') {
      return true;
    }
    return Date.now() >= (payload.exp - leewaySeconds) * 1000;
  } catch {
    return true;
  }
}
