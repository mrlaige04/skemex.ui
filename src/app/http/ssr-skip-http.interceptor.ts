import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { throwError } from 'rxjs';

/**
 * Fail fast during SSR instead of waiting on backend fetch (PendingTasks / 9s stability timeout).
 * Client render mode should avoid most of these calls; this is a safety net.
 */
export const ssrSkipHttpInterceptor: HttpInterceptorFn = (req, next) => {
  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    return next(req);
  }

  return throwError(
    () =>
      new HttpErrorResponse({
        error: 'HTTP skipped during SSR',
        status: 0,
        statusText: 'SSR',
        url: req.url,
      }),
  );
};
