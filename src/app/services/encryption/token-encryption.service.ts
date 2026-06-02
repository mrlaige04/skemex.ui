import { Inject, Injectable } from '@angular/core';
import { TOKEN_STORAGE_ENCRYPTION_KEY } from '../../config/token-storage.config';

const AES_IV_LENGTH = 12;

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

/**
 * AES-GCM encryption for small strings (e.g. token JSON).
 * Key is derived with SHA-256 from {@link TOKEN_STORAGE_ENCRYPTION_KEY}.
 */
@Injectable({ providedIn: 'root' })
export class TokenEncryptionService {
  private readonly keyPromise: Promise<CryptoKey>;

  constructor(@Inject(TOKEN_STORAGE_ENCRYPTION_KEY) secret: string) {
    this.keyPromise = this.importKey(secret);
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
    const packed = base64ToUint8(packedBase64);
    const iv = packed.slice(0, AES_IV_LENGTH);
    const ciphertext = packed.slice(AES_IV_LENGTH);
    const key = await this.keyPromise;
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(plainBuf);
  }
}
