import { GEAR_CATEGORIES, PRIORITIES, WISHLIST_STATUSES } from '../config/constants.js';
import { prisma } from '../utils/prisma.js';
import { createError, sendData } from '../utils/response.js';

function validateWishlist(body, partial = false) {
  const required = ['name', 'category', 'estimatedPrice', 'priority', 'status'];
  if (!partial) {
    for (const field of required) {
      if (body[field] === undefined || body[field] === '') throw createError(400, 'VALIDATION_ERROR', `${field} is required.`);
    }
  }
  if (body.category && !GEAR_CATEGORIES.includes(body.category)) throw createError(400, 'VALIDATION_ERROR', 'Invalid category.');
  if (body.priority && !PRIORITIES.includes(body.priority)) throw createError(400, 'VALIDATION_ERROR', 'Invalid priority.');
  if (body.status && !WISHLIST_STATUSES.includes(body.status)) throw createError(400, 'VALIDATION_ERROR', 'Invalid status.');
  if (body.estimatedPrice !== undefined && Number(body.estimatedPrice) < 0) throw createError(400, 'VALIDATION_ERROR', 'Estimated price must be non-negative.');
}

function wishlistData(body) {
  const data = {};
  for (const field of ['name', 'category', 'brand', 'priority', 'plannedMonth', 'status', 'reason', 'notes']) {
    if (body[field] !== undefined) data[field] = body[field] || null;
  }
  if (body.estimatedPrice !== undefined) data.estimatedPrice = Number(body.estimatedPrice);
  return data;
}

function whereFromQuery(query) {
  const where = {};
  if (query.category) where.category = String(query.category);
  if (query.priority) where.priority = String(query.priority);
  if (query.status) where.status = String(query.status);
  return where;
}

export async function listWishlist(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const where = { ...whereFromQuery(req.query), userId: req.user.id };
    const [items, total] = await Promise.all([
      prisma.wishlistItem.findMany({ where, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
      prisma.wishlistItem.count({ where })
    ]);
    const budget = items.reduce((sum, item) => sum + Number(item.estimatedPrice), 0);
    return sendData(res, items, { page, limit, total, budget });
  } catch (error) {
    return next(error);
  }
}

export async function getWishlistItem(req, res, next) {
  try {
    const item = await prisma.wishlistItem.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!item) return next(createError(404, 'NOT_FOUND', 'Wishlist item not found.'));
    return sendData(res, item);
  } catch (error) {
    return next(error);
  }
}

export async function createWishlistItem(req, res, next) {
  try {
    validateWishlist(req.body);
    const item = await prisma.wishlistItem.create({ data: { ...wishlistData(req.body), userId: req.user.id } });
    return sendData(res.status(201), item);
  } catch (error) {
    return next(error);
  }
}

export async function updateWishlistItem(req, res, next) {
  try {
    validateWishlist(req.body, true);
    const existing = await prisma.wishlistItem.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return next(createError(404, 'NOT_FOUND', 'Wishlist item not found.'));
    const item = await prisma.wishlistItem.update({ where: { id: req.params.id }, data: wishlistData(req.body) });
    return sendData(res, item);
  } catch (error) {
    if (error.code === 'P2025') return next(createError(404, 'NOT_FOUND', 'Wishlist item not found.'));
    return next(error);
  }
}

export async function deleteWishlistItem(req, res, next) {
  try {
    const existing = await prisma.wishlistItem.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return next(createError(404, 'NOT_FOUND', 'Wishlist item not found.'));
    await prisma.wishlistItem.delete({ where: { id: req.params.id } });
    return sendData(res, { deleted: true });
  } catch (error) {
    if (error.code === 'P2025') return next(createError(404, 'NOT_FOUND', 'Wishlist item not found.'));
    return next(error);
  }
}
