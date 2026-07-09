export type InsightsOverview = {
  assetValueComparison: {
    purchaseTotal: number;
    currentValueTotal: number;
    depreciationTotal: number;
  };
  categoryAssetShare: Array<{ category: string; value: number; share: number; count: number }>;
  monthlyMaintenanceCost: Array<{ month: string; cost: number }>;
  wishlistBudgetDistribution: Array<{ priority: string; budget: number; count: number }>;
  topDepreciation: Array<{
    id: string;
    name: string;
    category: string;
    brand: string;
    purchasePrice: number;
    currentValue: number;
    depreciationAmount: number;
    depreciationRate: number;
  }>;
  advice: string[];
};
