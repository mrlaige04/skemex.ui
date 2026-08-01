import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { catchError, switchMap, throwError, timer } from 'rxjs';

const RETRY_HEADER = 'X-Skemex-Transient-Retry';

/**
 * Retries once on HTTP status 0 (aborted/cancelled), which often flashes during
 * page load/hydration when duplicate navigations cancel in-flight fetch requests.
 * Skips intentional SSR short-circuits.
 */
export const transientRetryInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: unknown) => {
      if (
        !(err instanceof HttpErrorResponse) ||
        err.status !== 0 ||
        err.statusText === 'SSR' ||
        req.headers.has(RETRY_HEADER)
      ) {
        return throwError(() => err);
      }

      const retry = req.clone({
        setHeaders: { [RETRY_HEADER]: '1' },
      });

      return timer(75).pipe(switchMap(() => next(retry)));
    }),
  );
};
