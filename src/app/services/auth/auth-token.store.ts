import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import type { AccessTokenResponse } from '../../models/auth/auth.models';
import { TokenEncryptionService } from '../encryption/token-encryption.service';

/** Encrypted session blob (name intentionally generic). */
const STORAGE_KEY = 'skemex.cx.dcfg';
/** Earlier key; read once and re-key so existing users keep the session. */
const PREVIOUS_ENCRYPTED_STORAGE_KEY = 'skemex.authTokens';

const LEGACY_ACCESS_KEY = 'skemex.accessToken';
const LEGACY_REFRESH_KEY = 'skemex.refreshToken';

/**
 * Persists the full {@link AccessTokenResponse} as one AES-GCM–encrypted value in `localStorage`.
 * Kept separate from {@link AuthService} to avoid HttpClient ↔ interceptor circular DI.
 */
@Injectable({ providedIn: 'root' })
export class AuthTokenStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly encryption = inject(TokenEncryptionService);

  private readonly bundle = signal<AccessTokenResponse | null>(null);

  /** Current bearer access token (hydrated from storage in the browser). */
  readonly accessToken = computed(() => this.bundle()?.accessToken ?? null);

  /**
   * Resolves after encrypted session is read from `localStorage` (or immediately on the server).
   * Use with `provideAppInitializer` so the first HTTP calls see the access token.
   */
  readonly whenHydrated: Promise<void>;

  constructor() {
    this.whenHydrated = isPlatformBrowser(this.platformId) ? this.restore() : Promise.resolve();
  }

  async persistFromAccessTokenResponse(token: AccessTokenResponse): Promise<void> {
    this.bundle.set(token);
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.stripLegacyPlaintextKeys();
    const enc = await this.encryption.encrypt(JSON.stringify(token));
    localStorage.setItem(STORAGE_KEY, enc);
    localStorage.removeItem(PREVIOUS_ENCRYPTED_STORAGE_KEY);
  }

  clear(): void {
    this.bundle.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PREVIOUS_ENCRYPTED_STORAGE_KEY);
      this.stripLegacyPlaintextKeys();
    }
  }

  readRefreshToken(): string | null {
    const rt = this.bundle()?.refreshToken;
    return rt == null || rt === '' ? null : rt;
  }

  private async restore(): Promise<void> {
    let existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      const rekey = localStorage.getItem(PREVIOUS_ENCRYPTED_STORAGE_KEY);
      if (rekey) {
        localStorage.setItem(STORAGE_KEY, rekey);
        localStorage.removeItem(PREVIOUS_ENCRYPTED_STORAGE_KEY);
        existing = rekey;
      }
    }
    if (!existing) {
      await this.tryMigrateLegacyPlaintext();
      return;
    }
    try {
      const json = await this.encryption.decrypt(existing);
      this.bundle.set(JSON.parse(json) as AccessTokenResponse);
      this.stripLegacyPlaintextKeys();
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PREVIOUS_ENCRYPTED_STORAGE_KEY);
      this.stripLegacyPlaintextKeys();
    }
  }

  /** One-time migration from older separate plaintext keys. */
  private async tryMigrateLegacyPlaintext(): Promise<void> {
    const at = localStorage.getItem(LEGACY_ACCESS_KEY);
    if (!at) {
      return;
    }
    const rt = localStorage.getItem(LEGACY_REFRESH_KEY);
    const migrated: AccessTokenResponse = {
      accessToken: at,
      tokenType: 'Bearer',
      refreshToken: rt,
    };
    this.stripLegacyPlaintextKeys();
    await this.persistFromAccessTokenResponse(migrated);
  }

  private stripLegacyPlaintextKeys(): void {
    localStorage.removeItem(LEGACY_ACCESS_KEY);
    localStorage.removeItem(LEGACY_REFRESH_KEY);
  }
}
