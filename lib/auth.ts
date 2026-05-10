import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { SessionUser } from './types';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-not-for-production';

const BCRYPT_ROUNDS = 12;

// Bcrypt hashes always start with $2b$ or $2a$
function isBcryptHash(hash: string): boolean {
  return hash.startsWith('$2b$') || hash.startsWith('$2a$');
}

// Legacy SHA-256 hash — kept only for transparent migration on login
async function sha256Hash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verifies a password against a stored hash.
 * Returns { valid, needsRehash } — if needsRehash is true, the caller should
 * update the stored hash to the new bcrypt value (transparent migration).
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (isBcryptHash(storedHash)) {
    const valid = await bcrypt.compare(password, storedHash);
    return { valid, needsRehash: false };
  }

  // Legacy SHA-256 path — verify, then signal that re-hash is needed
  const sha = await sha256Hash(password);
  const valid = sha === storedHash;
  return { valid, needsRehash: valid };
}

export async function newHashForMigration(password: string): Promise<string> {
  return hashPassword(password);
}

export function createToken(user: SessionUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      is_admin: user.is_admin,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionUser;
    return decoded;
  } catch {
    return null;
  }
}

export function getSessionFromCookie(cookieHeader: string | null): SessionUser | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  const token = cookies['auth-token'];
  if (!token) return null;

  return verifyToken(token);
}
