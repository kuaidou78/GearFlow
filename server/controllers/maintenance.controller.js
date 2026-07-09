import { MAINTENANCE_TYPES } from '../config/constants.js';
import { prisma } from '../utils/prisma.js';
import { createError, sendData } from '../utils/response.js';

function validateMaintenance(body, partial = false) {
  const required = ['gearId', 'type', 'title', 'maintenanceDate', 'cost'];
  if (!partial) {
    for (const field of required) {
      if (body[field] === undefined || body[field] === '') throw createError(400, 'VALIDATION_ERROR', `${field} is required.`);
    }
  }
  if (body.type && !MAINTENANCE_TYPES.includes(body.type)) throw createError(400, 'VALIDATION_ERROR', 'Invalid maintenance type.');
  if (body.cost !== undefined && Number(body.cost) < 0) throw createError(400, 'VALIDATION_ERROR', 'Cost must be non-negative.');
}

function maintenanceData(body) {
  const data = {};
  for (const field of ['gearId', 'type', 'title', 'notes']) {
    if (body[field] !== undefined) data[field] = body[field] || null;
  }
  if (body.maintenanceDate !== undefined) data.maintenanceDate = new Date(body.maintenanceDate);
  if (body.nextDueDate !== undefined) data.nextDueDate = body.nextDueDate ? new Date(body.nextDueDate) : null;
  if (body.cost !== undefined) data.cost = Number(body.cost);
  return data;
}

function whereFromQuery(query) {
  const where = {};
  if (query.gearId) where.gearId = String(query.gearId);
  if (query.type) where.type = String(query.type);
  if (query.due === 'upcoming') {
    const soon = new Date();
    soon.setDate(soon.getDate() + 45);
    where.nextDueDate = { lte: soon };
  }
  return where;
}

export async function listMaintenance(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const where = { ...whereFromQuery(req.query), userId: req.user.id };
    const [items, total] = await Promise.all([
      prisma.maintenance.findMany({
        where,
        include: { gear: { select: { id: true, name: true, category: true, brand: true } } },
        orderBy: { maintenanceDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.maintenance.count({ where })
    ]);
    return sendData(res, items, { page, limit, total });
  } catch (error) {
    return next(error);
  }
}

export async function getMaintenance(req, res, next) {
  try {
    const item = await prisma.maintenance.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { gear: { select: { id: true, name: true, category: true, brand: true } } }
    });
    if (!item) return next(createError(404, 'NOT_FOUND', 'Maintenance record not found.'));
    return sendData(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function createMaintenance(req, res, next) {
  try {
    validateMaintenance(req.body);
    const gear = await prisma.gear.findFirst({ where: { id: req.body.gearId, userId: req.user.id } });
    if (!gear) return next(createError(404, 'NOT_FOUND', 'Gear not found.'));
    const item = await prisma.maintenance.create({
      data: { ...maintenanceData(req.body), userId: req.user.id },
      include: { gear: { select: { id: true, name: true, category: true, brand: true } } }
    });
    return sendData(res.status(201), item);
  } catch (error) {
    if (error.code === 'P2003') return next(createError(404, 'NOT_FOUND', 'Gear not found.'));
    return next(error);
  }
}

export async function updateMaintenance(req, res, next) {
  try {
    validateMaintenance(req.body, true);
    const existing = await prisma.maintenance.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return next(createError(404, 'NOT_FOUND', 'Maintenance record not found.'));
    if (req.body.gearId) {
      const gear = await prisma.gear.findFirst({ where: { id: req.body.gearId, userId: req.user.id } });
      if (!gear) return next(createError(404, 'NOT_FOUND', 'Gear not found.'));
    }
    const item = await prisma.maintenance.update({
      where: { id: req.params.id },
      data: maintenanceData(req.body),
      include: { gear: { select: { id: true, name: true, category: true, brand: true } } }
    });
    return sendData(res, item);
  } catch (error) {
    if (error.code === 'P2025') return next(createError(404, 'NOT_FOUND', 'Maintenance record not found.'));
    if (error.code === 'P2003') return next(createError(404, 'NOT_FOUND', 'Gear not found.'));
    return next(error);
  }
}

export async function deleteMaintenance(req, res, next) {
  try {
    const existing = await prisma.maintenance.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return next(createError(404, 'NOT_FOUND', 'Maintenance record not found.'));
    await prisma.maintenance.delete({ where: { id: req.params.id } });
    return sendData(res, { deleted: true });
  } catch (error) {
    if (error.code === 'P2025') return next(createError(404, 'NOT_FOUND', 'Maintenance record not found.'));
    return next(error);
  }
}
