import { InjectionToken, type Provider } from '@angular/core';
import { environment } from '../../environments/environment';

export const TOKEN_STORAGE_ENCRYPTION_KEY = new InjectionToken<string>('TOKEN_STORAGE_ENCRYPTION_KEY');

export const tokenStorageEncryptionKeyProvider: Provider = {
  provide: TOKEN_STORAGE_ENCRYPTION_KEY,
  useFactory: (): string => environment.tokenStorageEncryptionKey,
};
