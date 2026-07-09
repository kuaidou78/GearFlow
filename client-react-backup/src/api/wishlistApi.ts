import { WishlistInput, WishlistItem } from '../types/wishlist';
import { queryString, request } from './httpClient';

export type WishlistFilters = {
  category?: string;
  priority?: string;
  status?: string;
};

export const wishlistApi = {
  list: (filters: WishlistFilters = {}) => request<WishlistItem[]>(`/api/wishlist${queryString(filters)}`),
  create: (body: WishlistInput) => request<WishlistItem>('/api/wishlist', { method: 'POST', body }),
  update: (id: string, body: Partial<WishlistInput>) => request<WishlistItem>(`/api/wishlist/${id}`, { method: 'PUT', body }),
  remove: (id: string) => request<{ deleted: boolean }>(`/api/wishlist/${id}`, { method: 'DELETE' })
};
