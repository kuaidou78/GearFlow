import { clearCookieOptions, cookieOptions, createSessionToken, getCookieName, hashPassword, verifyPassword, verifySessionToken } from '../services/session.service.js';
import { prisma } from '../utils/prisma.js';
import { createError, sendData } from '../utils/response.js';

const userSelect = { id: true, email: true, name: true, role: true, createdAt: true };

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validatePassword(password) {
  if (!password || String(password).length < 6) {
    throw createError(400, 'VALIDATION_ERROR', 'Password must be at least 6 characters.');
  }
}

export async function register(req, res, next) {
  try {
    const name = String(req.body?.name || '').trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    if (!name || !email) throw createError(400, 'VALIDATION_ERROR', 'Name and email are required.');
    validatePassword(password);

    const user = await prisma.user.create({
      data: { name, email, passwordHash: hashPassword(password) },
      select: userSelect
    });
    res.cookie(getCookieName(), createSessionToken(user), cookieOptions());
    return sendData(res.status(201), { user });
  } catch (error) {
    if (error.code === 'P2002') return next(createError(409, 'EMAIL_EXISTS', 'Email is already registered.'));
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    if (!email || !password) throw createError(400, 'VALIDATION_ERROR', 'Email and password are required.');

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const publicUser = { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
    res.cookie(getCookieName(), createSessionToken(publicUser), cookieOptions());
    return sendData(res, { user: publicUser });
  } catch (error) {
    return next(error);
  }
}

export function logout(_req, res) {
  res.clearCookie(getCookieName(), clearCookieOptions());
  return sendData(res, { loggedOut: true });
}

export async function me(req, res, next) {
  try {
    const session = verifySessionToken(req.cookies?.[getCookieName()]);
    if (!session) return next(createError(401, 'UNAUTHORIZED', 'Login is required.'));

    const user = await prisma.user.findUnique({ where: { id: session.id }, select: userSelect });
    if (!user) return next(createError(401, 'UNAUTHORIZED', 'Login is required.'));
    return sendData(res, { user });
  } catch (error) {
    return next(error);
  }
}
