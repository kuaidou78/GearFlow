import { Gear } from './gear';
import { Maintenance } from './maintenance';
import { WishlistItem } from './wishlist';

export type DashboardSummary = {
  kpis: {
    gearCount: number;
    purchaseTotal: number;
    currentValueTotal: number;
    depreciationTotal: number;
    maintenanceTotal: number;
    wishlistBudget: number;
  };
  byCategory: Array<{ category: string; purchaseValue: number; currentValue: number; count: number }>;
  recentGear: Gear[];
  upcomingMaintenance: Maintenance[];
  highPriorityWishlist: WishlistItem[];
};
