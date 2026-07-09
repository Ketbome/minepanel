import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// AES-256-GCM encryption for secrets stored at rest (SMTP/OIDC/CurseForge).
// The key is derived from JWT_SECRET so no extra env var is needed. Rotating
// JWT_SECRET invalidates previously stored secrets (they must be re-entered).
const PREFIX = 'enc:v1:';
const IV_BYTES = 12;

function getKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required to encrypt/decrypt stored secrets');
  }
  return createHash('sha256').update(secret).digest();
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

// Decrypts a value produced by encryptSecret. Legacy plaintext (no prefix) is
// returned as-is so existing rows keep working before they are re-saved.
export function decryptSecret(value: string | null | undefined): string {
  if (!value) return '';
  if (!isEncrypted(value)) return value;

  const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + 16);
  const ciphertext = raw.subarray(IV_BYTES + 16);

  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
