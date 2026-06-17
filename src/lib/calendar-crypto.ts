import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const KEY_HEX = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY ?? '';

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error(
      '[calendar-crypto] CALENDAR_TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)'
    );
  }
  return Buffer.from(KEY_HEX, 'hex');
}

const ALGO = 'aes-256-gcm' as const;

/**
 * Encrypts a plaintext string.
 * Returns format: "iv_hex:authTag_hex:ciphertext_hex"
 */
export function encryptCalendarToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

/**
 * Decrypts a ciphertext string that was produced by encryptCalendarToken.
 */
export function decryptCalendarToken(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3)
    throw new Error('[calendar-crypto] Invalid token format');
  const [ivHex, tagHex, encHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc).toString('utf8') + decipher.final('utf8');
}
