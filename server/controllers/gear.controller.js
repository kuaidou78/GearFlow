import { CONDITIONS, GEAR_CATEGORIES } from '../config/constants.js';
import { withValuation } from '../services/depreciation.service.js';
import { prisma } from '../utils/prisma.js';
import { createError, sendData } from '../utils/response.js';

function validateGear(body, partial = false) {
  const required = ['name', 'category', 'brand', 'purchasePrice', 'purchaseDate', 'expectedLifespanMonths', 'condition', 'minResidualRate'];
  if (!partial) {
    for (const field of required) {
      if (body[field] === undefined || body[field] === '') throw createError(400, 'VALIDATION_ERROR', `${field} is required.`);
    }
  }
  if (body.category && !GEAR_CATEGORIES.includes(body.category)) throw createError(400, 'VALIDATION_ERROR', 'Invalid category.');
  if (body.condition && !CONDITIONS.includes(body.condition)) throw createError(400, 'VALIDATION_ERROR', 'Invalid condition.');
  if (body.purchasePrice !== undefined && Number(body.purchasePrice) < 0) throw createError(400, 'VALIDATION_ERROR', 'Purchase price must be non-negative.');
  if (body.expectedLifespanMonths !== undefined && Number(body.expectedLifespanMonths) <= 0) throw createError(400, 'VALIDATION_ERROR', 'Expected lifespan must be positive.');
}

function gearData(body) {
  const data = {};
  for (const field of ['name', 'category', 'brand', 'model', 'condition', 'notes', 'bikeId']) {
    if (body[field] !== undefined) data[field] = body[field] || null;
  }
  if (body.purchasePrice !== undefined) data.purchasePrice = Number(body.purchasePrice);
  if (body.purchaseDate !== undefined) data.purchaseDate = new Date(body.purchaseDate);
  if (body.expectedLifespanMonths !== undefined) data.expectedLifespanMonths = Number(body.expectedLifespanMonths);
  if (body.minResidualRate !== undefined) data.minResidualRate = Number(body.minResidualRate);
  if (body.isArchived !== undefined) data.isArchived = Boolean(body.isArchived);
  return data;
}

function whereFromQuery(query) {
  const where = { isArchived: false };
  if (query.category) where.category = String(query.category);
  if (query.condition) where.condition = String(query.condition);
  if (query.bikeId) where.bikeId = String(query.bikeId);
  if (query.search) {
    const search = String(query.search);
    where.OR = [
      { name: { contains: search } },
      { brand: { contains: search } },
      { model: { contains: search } }
    ];
  }
  return where;
}

function orderBy(sort) {
  switch (sort) {
    case 'price_desc':
      return { purchasePrice: 'desc' };
    case 'price_asc':
      return { purchasePrice: 'asc' };
    case 'purchaseDate_asc':
      return { purchaseDate: 'asc' };
    case 'createdAt_desc':
    default:
      return { createdAt: 'desc' };
  }
}

export async function listGears(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const where = { ...whereFromQuery(req.query), userId: req.user.id };
    const [items, total] = await Promise.all([
      prisma.gear.findMany({
        where,
        include: { bike: { select: { id: true, name: true, brand: true, model: true } } },
        orderBy: orderBy(req.query.sort),
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.gear.count({ where })
    ]);
    return sendData(res, items.map(withValuation), { page, limit, total });
  } catch (error) {
    return next(error);
  }
}

export async function getGear(req, res, next) {
  try {
    const item = await prisma.gear.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        bike: { select: { id: true, name: true, brand: true, model: true } },
        maintenance: { orderBy: { maintenanceDate: 'desc' } }
      }
    });
    if (!item) return next(createError(404, 'NOT_FOUND', 'Gear not found.'));
    return sendData(res, withValuation(item));
  } catch (error) {
    return next(error);
  }
}

export async function createGear(req, res, next) {
  try {
    validateGear(req.body);
    if (req.body.bikeId) {
      const bike = await prisma.bike.findFirst({ where: { id: req.body.bikeId, userId: req.user.id } });
      if (!bike) return next(createError(404, 'NOT_FOUND', 'Bike not found.'));
    }
    const item = await prisma.gear.create({
      data: { ...gearData(req.body), userId: req.user.id },
      include: { bike: { select: { id: true, name: true, brand: true, model: true } } }
    });
    return sendData(res.status(201), withValuation(item));
  } catch (error) {
    return next(error);
  }
}

export async function updateGear(req, res, next) {
  try {
    validateGear(req.body, true);
    const existing = await prisma.gear.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return next(createError(404, 'NOT_FOUND', 'Gear not found.'));
    if (req.body.bikeId) {
      const bike = await prisma.bike.findFirst({ where: { id: req.body.bikeId, userId: req.user.id } });
      if (!bike) return next(createError(404, 'NOT_FOUND', 'Bike not found.'));
    }
    const item = await prisma.gear.update({
      where: { id: req.params.id },
      data: gearData(req.body),
      include: { bike: { select: { id: true, name: true, brand: true, model: true } } }
    });
    return sendData(res, withValuation(item));
  } catch (error) {
    if (error.code === 'P2025') return next(createError(404, 'NOT_FOUND', 'Gear not found.'));
    return next(error);
  }
}

export async function deleteGear(req, res, next) {
  try {
    const existing = await prisma.gear.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return next(createError(404, 'NOT_FOUND', 'Gear not found.'));
    await prisma.gear.delete({ where: { id: req.params.id } });
    return sendData(res, { deleted: true });
  } catch (error) {
    if (error.code === 'P2025') return next(createError(404, 'NOT_FOUND', 'Gear not found.'));
    return next(error);
  }
}
