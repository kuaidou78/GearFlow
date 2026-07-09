import { getCookieName, verifySessionToken } from '../services/session.service.js';
import { prisma } from '../utils/prisma.js';
import { createError } from '../utils/response.js';

export async function requireAuth(req, _res, next) {
  try {
    const session = verifySessionToken(req.cookies?.[getCookieName()]);
    if (!session) return next(createError(401, 'UNAUTHORIZED', 'Login is required.'));

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });
    if (!user) return next(createError(401, 'UNAUTHORIZED', 'Login is required.'));

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}
