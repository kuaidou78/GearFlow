import { prisma } from '../utils/prisma.js';
import { createError, sendData } from '../utils/response.js';

function validateBike(body, partial = false) {
  const required = ['name', 'brand', 'bikeType'];
  if (!partial) {
    for (const field of required) {
      if (body[field] === undefined || body[field] === '') throw createError(400, 'VALIDATION_ERROR', `${field} is required.`);
    }
  }
}

function bikeData(body) {
  const data = {};
  for (const field of ['name', 'brand', 'model', 'bikeType', 'notes']) {
    if (body[field] !== undefined) data[field] = body[field] || null;
  }
  if (body.purchaseDate !== undefined) data.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
  if (body.isArchived !== undefined) data.isArchived = Boolean(body.isArchived);
  return data;
}

function whereFromQuery(query) {
  const where = { isArchived: false };
  if (query.type) where.bikeType = String(query.type);
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

export async function listBikes(req, res, next) {
  try {
    const where = { ...whereFromQuery(req.query), userId: req.user.id };
    const items = await prisma.bike.findMany({
      where,
      include: { _count: { select: { rides: true, gears: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return sendData(res, items, { total: items.length });
  } catch (error) {
    return next(error);
  }
}

export async function getBike(req, res, next) {
  try {
    const item = await prisma.bike.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        rides: { orderBy: { rideDate: 'desc' }, take: 10 },
        gears: { where: { isArchived: false }, orderBy: { createdAt: 'desc' } }
      }
    });
    if (!item) return next(createError(404, 'NOT_FOUND', 'Bike not found.'));
    return sendData(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function createBike(req, res, next) {
  try {
    validateBike(req.body);
    const item = await prisma.bike.create({ data: { ...bikeData(req.body), userId: req.user.id } });
    return sendData(res.status(201), item);
  } catch (error) {
    return next(error);
  }
}

export async function updateBike(req, res, next) {
  try {
    validateBike(req.body, true);
    const existing = await prisma.bike.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return next(createError(404, 'NOT_FOUND', 'Bike not found.'));
    const item = await prisma.bike.update({ where: { id: req.params.id }, data: bikeData(req.body) });
    return sendData(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function deleteBike(req, res, next) {
  try {
    const existing = await prisma.bike.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return next(createError(404, 'NOT_FOUND', 'Bike not found.'));
    await prisma.bike.delete({ where: { id: req.params.id } });
    return sendData(res, { deleted: true });
  } catch (error) {
    return next(error);
  }
}
