import { GearCategory } from './gear';

export type Priority = 'low' | 'medium' | 'high';
export type WishlistStatus = 'planned' | 'watching' | 'purchased' | 'paused';

export type WishlistItem = {
  id: string;
  name: string;
  category: GearCategory;
  brand?: string | null;
  estimatedPrice: number;
  priority: Priority;
  plannedMonth?: string | null;
  status: WishlistStatus;
  reason?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WishlistInput = {
  name: string;
  category: GearCategory;
  brand?: string;
  estimatedPrice: number;
  priority: Priority;
  plannedMonth?: string;
  status: WishlistStatus;
  reason?: string;
  notes?: string;
};
