import { prisma } from '../utils/prisma.js';
import { createError, sendData } from '../utils/response.js';

function validateRide(body, partial = false) {
  const required = ['title', 'rideDate', 'distanceKm', 'durationMin'];
  if (!partial) {
    for (const field of required) {
      if (body[field] === undefined || body[field] === '') throw createError(400, 'VALIDATION_ERROR', `${field} is required.`);
    }
  }
  if (body.distanceKm !== undefined && Number(body.distanceKm) < 0) throw createError(400, 'VALIDATION_ERROR', 'Distance must be non-negative.');
  if (body.durationMin !== undefined && Number(body.durationMin) <= 0) throw createError(400, 'VALIDATION_ERROR', 'Duration must be positive.');
  if (body.elevationM !== undefined && Number(body.elevationM) < 0) throw createError(400, 'VALIDATION_ERROR', 'Elevation must be non-negative.');
}

function rideData(body) {
  const data = {};
  for (const field of ['bikeId', 'title', 'route', 'notes']) {
    if (body[field] !== undefined) data[field] = body[field] || null;
  }
  if (body.rideDate !== undefined) data.rideDate = new Date(body.rideDate);
  if (body.distanceKm !== undefined) data.distanceKm = Number(body.distanceKm);
  if (body.durationMin !== undefined) data.durationMin = Number(body.durationMin);
  if (body.elevationM !== undefined) data.elevationM = Number(body.elevationM || 0);
  return data;
}

function whereFromQuery(query) {
  const where = {};
  if (query.bikeId) where.bikeId = String(query.bikeId);
  if (query.from || query.to) {
    where.rideDate = {};
    if (query.from) where.rideDate.gte = new Date(String(query.from));
    if (query.to) where.rideDate.lte = new Date(String(query.to));
  }
  if (query.search) {
    const search = String(query.search);
    where.OR = [
      { title: { contains: search } },
      { route: { contains: search } }
    ];
  }
  return where;
}

async function assertBikeOwner(userId, bikeId) {
  if (!bikeId) return;
  const bike = await prisma.bike.findFirst({ where: { id: bikeId, userId } });
  if (!bike) throw createError(404, 'NOT_FOUND', 'Bike not found.');
}

export async function listRides(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const where = { ...whereFromQuery(req.query), userId: req.user.id };
    const [items, total] = await Promise.all([
      prisma.ride.findMany({
        where,
        include: { bike: { select: { id: true, name: true, brand: true, model: true } } },
        orderBy: { rideDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.ride.count({ where })
    ]);
    return sendData(res, items, { page, limit, total });
  } catch (error) {
    return next(error);
  }
}

export async function getRide(req, res, next) {
  try {
    const item = await prisma.ride.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { bike: { select: { id: true, name: true, brand: true, model: true } } }
    });
    if (!item) return next(createError(404, 'NOT_FOUND', 'Ride not found.'));
    return sendData(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function createRide(req, res, next) {
  try {
    validateRide(req.body);
    await assertBikeOwner(req.user.id, req.body.bikeId);
    const item = await prisma.ride.create({
      data: { ...rideData(req.body), userId: req.user.id },
      include: { bike: { select: { id: true, name: true, brand: true, model: true } } }
    });
    return sendData(res.status(201), item);
  } catch (error) {
    return next(error);
  }
}

export async function updateRide(req, res, next) {
  try {
    validateRide(req.body, true);
    const existing = await prisma.ride.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return next(createError(404, 'NOT_FOUND', 'Ride not found.'));
    await assertBikeOwner(req.user.id, req.body.bikeId);
    const item = await prisma.ride.update({
      where: { id: req.params.id },
      data: rideData(req.body),
      include: { bike: { select: { id: true, name: true, brand: true, model: true } } }
    });
    return sendData(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function deleteRide(req, res, next) {
  try {
    const existing = await prisma.ride.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return next(createError(404, 'NOT_FOUND', 'Ride not found.'));
    await prisma.ride.delete({ where: { id: req.params.id } });
    return sendData(res, { deleted: true });
  } catch (error) {
    return next(error);
  }
}
