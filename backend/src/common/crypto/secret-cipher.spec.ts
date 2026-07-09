import { decryptSecret, encryptSecret, isEncrypted } from './secret-cipher';

describe('secret-cipher', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-for-cipher';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('round-trips a value', () => {
    const enc = encryptSecret('super-secret-pass');
    expect(enc).not.toContain('super-secret-pass');
    expect(isEncrypted(enc)).toBe(true);
    expect(decryptSecret(enc)).toBe('super-secret-pass');
  });

  it('produces a different ciphertext each time (random IV)', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
  });

  it('returns legacy plaintext untouched', () => {
    expect(isEncrypted('plain-value')).toBe(false);
    expect(decryptSecret('plain-value')).toBe('plain-value');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(decryptSecret(null)).toBe('');
    expect(decryptSecret(undefined)).toBe('');
    expect(decryptSecret('')).toBe('');
  });

  it('fails to decrypt when the key changed', () => {
    const enc = encryptSecret('value');
    process.env.JWT_SECRET = 'a-different-secret';
    expect(() => decryptSecret(enc)).toThrow();
    process.env.JWT_SECRET = 'test-secret-for-cipher';
  });
});
