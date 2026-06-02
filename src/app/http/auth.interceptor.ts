import { isPlatformBrowser } from '@angular/common';
import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthRefreshService } from '../services/auth/auth-refresh.service';
import { AuthTokenStore } from '../services/auth/auth-token.store';
import { isAccessTokenExpired } from '../utils/jwt.util';
import { isAuthAnonymousRequest } from './auth-request.util';

const RETRY_HEADER = 'X-Skemex-Auth-Retry';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId) || isAuthAnonymousRequest(req.url)) {
    return next(req);
  }

  const tokens = inject(AuthTokenStore);
  const refresh = inject(AuthRefreshService);

  const send = (accessToken: string | null) => {
    const authed =
      accessToken && accessToken.length > 0
        ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
        : req;

    return next(authed).pipe(
      catchError((err: unknown) => {
        if (
          !(err instanceof HttpErrorResponse) ||
          err.status !== 401 ||
          req.headers.has(RETRY_HEADER)
        ) {
          return throwError(() => err);
        }

        return from(refresh.tryRefresh()).pipe(
          switchMap((ok) => {
            if (!ok) {
              return throwError(() => err);
            }
            const newToken = tokens.accessToken();
            if (!newToken) {
              return throwError(() => err);
            }
            const retry = req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}`, [RETRY_HEADER]: '1' },
            });
            return next(retry);
          }),
        );
      }),
    );
  };

  const accessToken = tokens.accessToken();
  if (!accessToken) {
    return send(null);
  }

  if (!isAccessTokenExpired(accessToken)) {
    return send(accessToken);
  }

  return from(refresh.tryRefresh()).pipe(
    switchMap((ok) => {
      if (!ok) {
        return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));
      }
      return send(tokens.accessToken());
    }),
  );
};
