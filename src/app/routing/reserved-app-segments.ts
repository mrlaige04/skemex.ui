/** First-level URL segments owned by the tenant/admin shell — not project codes. */
export const RESERVED_APP_SEGMENTS = new Set([
  'admin',
  'auth',
  'dashboard',
  'home',
  'invitations',
  'profile',
  'pricing',
  'projects',
  'settings',
  'tenant-select',
  'users',
]);

export function isReservedAppSegment(segment: string): boolean {
  return RESERVED_APP_SEGMENTS.has(segment.trim().toLowerCase());
}
