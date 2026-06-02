import type { AppEnvironment } from '../app/config/app-environment.model';

export const environment: AppEnvironment = {
  production: true,
  api: {
    url: 'https://localhost:7184',
  },
  /** Replace for production builds; must match the key used to encrypt existing sessions. */
  tokenStorageEncryptionKey: 'skemex-prod-token-storage-secret-min-32-chars!!',
};
