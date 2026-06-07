import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateApiKey(prefix: string = 'ks'): { plaintext: string; hash: string } {
  const random = crypto.randomBytes(32).toString('base64url');
  const plaintext = `${prefix}_${random}`;
  const hash = bcrypt.hashSync(plaintext, BCRYPT_ROUNDS);
  return { plaintext, hash };
}

export function verifyApiKey(plaintext: string, hash: string): boolean {
  return bcrypt.compareSync(plaintext, hash);
}

export function getApiKeyPrefix(key: string): string | null {
  const match = key.match(/^([a-z0-9]+)_.+$/);
  return match ? match[1] ?? null : null;
}

export function generateToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
