import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Repositories, UserRecord } from './db';

/**
 * Autenticación propia en el servidor:
 * - Contraseñas con scrypt (sal aleatoria por usuario, parámetros guardados junto al hash).
 * - Sesiones opacas: el navegador guarda un token aleatorio en una cookie HttpOnly y la
 *   base de datos solo guarda su hash SHA-256 (una fuga de la BD no permite suplantar sesiones).
 */

const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 };
export const SESSION_COOKIE = 'hypsos_session';
export const SESSION_DAYS = 30;
export const RESET_MINUTES = 60;

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCallback(password, salt, keylen, options, (error, key) => (error ? reject(error) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, SCRYPT.keylen, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const key = await scrypt(password.normalize('NFKC'), Buffer.from(salt, 'base64url'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Hash fijo para comparar cuando el email no existe: mismo coste, sin revelar si la cuenta existe. */
let dummyHash: Promise<string> | null = null;
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  return dummyHash;
}

export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function startSession(c: Context, repos: Repositories, userId: number, secure: boolean) {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  repos.sessions.create(hashToken(token), userId, expires);
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    path: '/',
    expires,
  });
}

export function endSession(c: Context, repos: Repositories) {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) repos.sessions.delete(hashToken(token));
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export function currentUser(c: Context, repos: Repositories): UserRecord | undefined {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token || token.length > 100) return undefined;
  return repos.sessions.findUser(hashToken(token));
}

/** Datos del usuario que se pueden enviar al navegador (nunca el hash de la contraseña). */
export const publicUser = (user: UserRecord) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  marketingOptIn: user.marketingOptIn,
  createdAt: user.createdAt,
});
