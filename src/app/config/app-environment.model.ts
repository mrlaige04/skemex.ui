import type { ApiConfig } from './api.config';

/** Shape shared by `src/environments/environment*.ts`. */
export interface AppEnvironment {
  production: boolean;
  api: ApiConfig;
  /** Secret used only to encrypt token JSON before `localStorage` (still visible in the client bundle). */
  tokenStorageEncryptionKey: string;
}
