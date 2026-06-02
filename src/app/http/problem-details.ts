import { HttpErrorResponse } from '@angular/common/http';

/** Best-effort message from ASP.NET `ProblemDetails` or plain error bodies. */
export function problemDetailMessage(err: HttpErrorResponse): string {
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
