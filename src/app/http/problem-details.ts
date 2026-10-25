import { HttpErrorResponse } from '@angular/common/http';

/** Network abort / offline / cancelled request (common during navigation & hydration). */
export function isTransientHttpFailure(err: unknown): boolean {
  return err instanceof HttpErrorResponse && err.status === 0;
}

function messagesFromErrorsBag(errors: unknown): string[] {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) {
    return [];
  }

  const messages: string[] = [];
  for (const value of Object.values(errors as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) {
      messages.push(value.trim());
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) {
          messages.push(item.trim());
        }
      }
    }
  }
  return messages;
}

function messageFromProblemBody(body: unknown): string | null {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const rec = body as Record<string, unknown>;

    // ASP.NET ValidationProblemDetails: prefer concrete field/code messages over the generic title.
    const fromErrors = messagesFromErrorsBag(rec['errors']);
    if (fromErrors.length > 0) {
      return [...new Set(fromErrors)].join(' ');
    }

    const detail = rec['detail'];
    if (typeof detail === 'string' && detail.trim()) {
      return detail.trim();
    }

    const title = rec['title'];
    if (typeof title === 'string' && title.trim()) {
      return title.trim();
    }
  }
  if (typeof body === 'string' && body.trim()) {
    return body;
  }
  return null;
}

/**
 * Best-effort message from ASP.NET `ProblemDetails` or plain error bodies.
 * Returns an empty string for transient status-0 failures so UI banners stay hidden
 * (aborted/cancelled requests during page load/navigation).
 */
export function problemDetailMessage(err: HttpErrorResponse | unknown): string {
  if (!(err instanceof HttpErrorResponse)) {
    return err instanceof Error && err.message.trim() ? err.message : 'Request failed';
  }

  if (isTransientHttpFailure(err)) {
    return '';
  }

  const fromBody = messageFromProblemBody(err.error);
  if (fromBody) {
    return fromBody;
  }

  return err.message || 'Request failed';
}

/** Like {@link problemDetailMessage}, but parses JSON error bodies returned as `Blob`. */
export async function problemDetailMessageAsync(err: unknown): Promise<string> {
  if (!(err instanceof HttpErrorResponse)) {
    return err instanceof Error && err.message.trim() ? err.message : 'Request failed';
  }

  if (isTransientHttpFailure(err)) {
    return '';
  }

  if (err.error instanceof Blob) {
    try {
      const text = (await err.error.text()).trim();
      if (text) {
        try {
          const parsed = messageFromProblemBody(JSON.parse(text) as unknown);
          if (parsed) {
            return parsed;
          }
        } catch {
          return text;
        }
      }
    } catch {
      // fall through
    }
  }

  return problemDetailMessage(err);
}
