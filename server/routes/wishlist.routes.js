import { Router } from 'express';
import { createWishlistItem, deleteWishlistItem, getWishlistItem, listWishlist, updateWishlistItem } from '../controllers/wishlist.controller.js';

export const wishlistRoutes = Router();

wishlistRoutes.get('/', listWishlist);
wishlistRoutes.get('/:id', getWishlistItem);
wishlistRoutes.post('/', createWishlistItem);
wishlistRoutes.put('/:id', updateWishlistItem);
wishlistRoutes.delete('/:id', deleteWishlistItem);
