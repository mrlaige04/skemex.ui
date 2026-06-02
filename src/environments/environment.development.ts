import type { AppEnvironment } from '../app/config/app-environment.model';

export const environment: AppEnvironment = {
  production: false,
  api: {
    url: 'https://localhost:7184',
  },
  tokenStorageEncryptionKey: 'skemex-dev-token-storage-secret-min-32-chars!!',
};
