import { HttpErrorResponse } from '@angular/common/http';
import { problemDetailMessage } from './problem-details';

const GENERIC =
  'Something went wrong while running the AI. Please try again in a moment.';
const UNAVAILABLE =
  'The AI service is temporarily unavailable. Please try again in a moment.';
const BUSY = 'The AI is busy right now. Please wait a bit and try again.';
const TIMEOUT = 'The AI took too long to respond. Please try again.';
const UNREACHABLE = "Couldn't reach the AI service. Please try again later.";
const AUTH =
  'The AI provider rejected the request. Ask an admin to check AI settings.';
const BAD_REQUEST = "The AI couldn't process that request. Try rephrasing it.";

/**
 * Maps technical AI / HTTP failures to short chat-safe copy.
 * Prefer backend-provided friendly text; this is a safety net for raw errors.
 */
export function aiUserFacingError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const fromStatus = fromStatusCode(err.status);
    if (fromStatus) {
      return fromStatus;
    }

    const fromBody = problemDetailMessage(err);
    if (fromBody) {
      return fromTechnical(fromBody);
    }
  }

  if (typeof err === 'string') {
    return fromTechnical(err);
  }

  if (err instanceof Error && err.message.trim()) {
    return fromTechnical(err.message);
  }

  return GENERIC;
}

export function aiUserFacingMessage(technical: string | null | undefined, fallback = GENERIC): string {
  if (!technical?.trim()) {
    return fallback;
  }
  return fromTechnical(technical.trim());
}

function fromStatusCode(status: number): string | null {
  if (status === 408 || status === 504) {
    return TIMEOUT;
  }
  if (status === 429) {
    return BUSY;
  }
  if (status === 401 || status === 403) {
    return AUTH;
  }
  if (status === 400 || status === 422) {
    return BAD_REQUEST;
  }
  if (status >= 500 && status <= 599) {
    return UNAVAILABLE;
  }
  if (status === 0) {
    return UNREACHABLE;
  }
  return null;
}

function fromTechnical(text: string): string {
  let value = text.trim();
  if (value.toLowerCase().startsWith('failed:')) {
    value = value.slice('failed:'.length).trim();
  }

  if (looksFriendly(value)) {
    return value.length > 400 ? `${value.slice(0, 400).trimEnd()}…` : value;
  }

  const statusMatch = value.match(/\b([1-5]\d{2})\b/);
  if (statusMatch) {
    return fromStatusCode(Number(statusMatch[1])) ?? UNAVAILABLE;
  }

  const lower = value.toLowerCase();
  if (includesAny(lower, ['service unavailable', 'bad gateway', 'gateway timeout'])) {
    return UNAVAILABLE;
  }
  if (includesAny(lower, ['too many requests', 'rate limit'])) {
    return BUSY;
  }
  if (includesAny(lower, ['unauthorized', 'forbidden', 'invalid api key'])) {
    return AUTH;
  }
  if (includesAny(lower, ['timed out', 'timeout', 'taskcanceled'])) {
    return TIMEOUT;
  }
  if (includesAny(lower, ['connection refused', 'failed to connect', 'network is unreachable'])) {
    return UNREACHABLE;
  }

  return GENERIC;
}

function looksFriendly(text: string): boolean {
  if (text.length > 280) {
    return false;
  }
  const lower = text.toLowerCase();
  if (
    includesAny(lower, [
      'exception',
      'stack trace',
      'status code',
      'ensureSuccessStatusCode',
      'response status code does not indicate success',
      'http://',
      'https://',
      'application/json',
    ])
  ) {
    return false;
  }
  return !/\b[1-5]\d{2}\b/.test(text);
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}
