import type { AppEnvironment } from '../app/config/app-environment.model';

/** Replaced at Docker build time (see Dockerfile). */
export const environment: AppEnvironment = {
  production: true,
  api: {
    url: '__API_URL__',
  },
  tokenStorageEncryptionKey: '__TOKEN_STORAGE_ENCRYPTION_KEY__',
};
