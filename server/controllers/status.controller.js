import { prisma } from '../utils/prisma.js';
import { sendData } from '../utils/response.js';

const startedAt = Date.now();

export async function status(_req, res, next) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return sendData(res, {
      api: 'ok',
      database: 'ok',
      env: process.env.NODE_ENV || 'development',
      port: Number(process.env.PORT || 3001),
      version: process.env.npm_package_version || '1.0.0',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    return next(error);
  }
}
