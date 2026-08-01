import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from './http/auth.interceptor';
import { transientRetryInterceptor } from './http/transient-retry.interceptor';
import { apiConfigProvider } from './config/api.config';
import { tokenStorageEncryptionKeyProvider } from './config/token-storage.config';
import { AuthTokenStore } from './services/auth/auth-token.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    apiConfigProvider,
    tokenStorageEncryptionKeyProvider,
    provideAppInitializer(() => inject(AuthTokenStore).whenHydrated),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, transientRetryInterceptor])),
    provideClientHydration(withEventReplay())
  ]
};
