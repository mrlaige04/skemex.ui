import { HttpErrorResponse } from '@angular/common/http';

/** Network abort / offline / cancelled request (common during navigation & hydration). */
export function isTransientHttpFailure(err: unknown): boolean {
  return err instanceof HttpErrorResponse && err.status === 0;
}

/**
 * Best-effort message from ASP.NET `ProblemDetails` or plain error bodies.
 * Returns an empty string for transient status-0 failures so UI banners stay hidden
 * (aborted/cancelled requests during page load/navigation).
 */
export function problemDetailMessage(err: HttpErrorResponse | unknown): string {
  if (!(err instanceof HttpErrorResponse)) {
    return 'Request failed';
  }

  if (isTransientHttpFailure(err)) {
    return '';
  }

  const body = err.error;
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const rec = body as Record<string, unknown>;
    const detail = rec['detail'];
    const title = rec['title'];
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (typeof title === 'string' && title.trim()) return title;
  }
  if (typeof err.error === 'string' && err.error) return err.error;
  return err.message || 'Request failed';
}
