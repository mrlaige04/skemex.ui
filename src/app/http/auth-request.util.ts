const AUTH_ANONYMOUS_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'] as const;

export function isAuthAnonymousRequest(url: string): boolean {
  return AUTH_ANONYMOUS_PATHS.some((path) => url.includes(path));
}
