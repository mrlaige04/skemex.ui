import { Inject, Injectable } from '@angular/core';
import { TOKEN_STORAGE_ENCRYPTION_KEY } from '../../config/token-storage.config';

const AES_IV_LENGTH = 12;
/** Stored when Web Crypto is unavailable (HTTP on non-localhost). */
const PLAINTEXT_PREFIX = 'p:';

function uint8ToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function canUseSubtleCrypto(): boolean {
  return typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle != null;
}

/**
 * AES-GCM encryption for small strings (e.g. token JSON) in secure contexts.
 * On HTTP (except localhost), falls back to base64-encoded plaintext so login still works until TLS is added.
 */
@Injectable({ providedIn: 'root' })
export class TokenEncryptionService {
  private readonly keyPromise: Promise<CryptoKey> | null;

  constructor(@Inject(TOKEN_STORAGE_ENCRYPTION_KEY) secret: string) {
    this.keyPromise = canUseSubtleCrypto() ? this.importKey(secret) : null;
  }

  private async importKey(secret: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', enc.encode(secret));
    return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
  }

  async encrypt(plainText: string): Promise<string> {
    if (!this.keyPromise) {
      return PLAINTEXT_PREFIX + uint8ToBase64(new TextEncoder().encode(plainText));
    }

    const iv = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
    const key = await this.keyPromise;
    const cipherBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(plainText),
    );
    const cipher = new Uint8Array(cipherBuf);
    const packed = new Uint8Array(iv.length + cipher.length);
    packed.set(iv);
    packed.set(cipher, iv.length);
    return uint8ToBase64(packed);
  }

  async decrypt(packedBase64: string): Promise<string> {
    if (packedBase64.startsWith(PLAINTEXT_PREFIX)) {
      return new TextDecoder().decode(base64ToUint8(packedBase64.slice(PLAINTEXT_PREFIX.length)));
    }

    if (!this.keyPromise) {
      throw new Error('Encrypted token storage is not available in this browser context.');
    }

    const packed = base64ToUint8(packedBase64);
    const iv = packed.slice(0, AES_IV_LENGTH);
    const ciphertext = packed.slice(AES_IV_LENGTH);
    const key = await this.keyPromise;
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(plainBuf);
  }
}
