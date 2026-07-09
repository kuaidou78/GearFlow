import crypto from 'node:crypto';

const COOKIE_NAME = 'gearflow_session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24;

function secret() {
  return process.env.SESSION_SECRET || 'gearflow-local-dev-secret';
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function getCookieName() {
  return COOKIE_NAME;
}

export function createSessionToken(user) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    issuedAt: Date.now()
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.id || !data.email || !data.issuedAt) return null;
    if (Date.now() - Number(data.issuedAt) > SESSION_MAX_AGE_MS) return null;
    return { id: data.id, email: data.email, role: data.role || 'user' };
  } catch {
    return null;
  }
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$120000$${salt}$${derivedKey}`;
}

export function verifyPassword(password, storedHash) {
  const [algorithm, iterations, salt, expected] = String(storedHash || '').split('$');
  if (algorithm !== 'pbkdf2_sha256' || !iterations || !salt || !expected) return false;
  const derivedKey = crypto.pbkdf2Sync(password, salt, Number(iterations), 32, 'sha256').toString('hex');
  return safeEqual(derivedKey, expected);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS
  };
}

export function clearCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/'
  };
}
