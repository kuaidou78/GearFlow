import { summarizeDashboard } from '../services/dashboard.service.js';
import { prisma } from '../utils/prisma.js';
import { sendData } from '../utils/response.js';

export async function dashboardSummary(req, res, next) {
  try {
    const [bikes, rides, gears, maintenance, wishlist] = await Promise.all([
      prisma.bike.findMany({ where: { userId: req.user.id, isArchived: false }, orderBy: { createdAt: 'desc' } }),
      prisma.ride.findMany({
        where: { userId: req.user.id },
        include: { bike: { select: { id: true, name: true } } },
        orderBy: { rideDate: 'desc' }
      }),
      prisma.gear.findMany({ where: { userId: req.user.id, isArchived: false }, orderBy: { createdAt: 'desc' } }),
      prisma.maintenance.findMany({
        where: { userId: req.user.id },
        include: { gear: { select: { id: true, name: true, category: true, brand: true } } },
        orderBy: { maintenanceDate: 'desc' }
      }),
      prisma.wishlistItem.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } })
    ]);
    return sendData(res, summarizeDashboard(gears, maintenance, wishlist, rides, bikes));
  } catch (error) {
    return next(error);
  }
}
