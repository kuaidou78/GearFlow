import { buildInsights } from '../services/dashboard.service.js';
import { prisma } from '../utils/prisma.js';
import { sendData } from '../utils/response.js';

export async function insightsOverview(req, res, next) {
  try {
    const [rides, gears, maintenance, wishlist] = await Promise.all([
      prisma.ride.findMany({ where: { userId: req.user.id }, include: { bike: { select: { id: true, name: true } } } }),
      prisma.gear.findMany({ where: { userId: req.user.id, isArchived: false } }),
      prisma.maintenance.findMany({ where: { userId: req.user.id } }),
      prisma.wishlistItem.findMany({ where: { userId: req.user.id } })
    ]);
    return sendData(res, buildInsights(gears, maintenance, wishlist, rides));
  } catch (error) {
    return next(error);
  }
}
