export type GearCategory = 'bike' | 'wheelset' | 'computer' | 'helmet' | 'shoes' | 'clothing' | 'tool' | 'drivetrain' | 'other';
export type GearCondition = 'new' | 'excellent' | 'good' | 'fair' | 'poor';

export type GearValuation = {
  currentValue: number;
  depreciationAmount: number;
  depreciationRate: number;
  usedMonths: number;
};

export type Gear = {
  id: string;
  name: string;
  category: GearCategory;
  brand: string;
  model?: string | null;
  purchasePrice: number;
  purchaseDate: string;
  expectedLifespanMonths: number;
  condition: GearCondition;
  minResidualRate: number;
  notes?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  valuation: GearValuation;
};

export type GearInput = {
  name: string;
  category: GearCategory;
  brand: string;
  model?: string;
  purchasePrice: number;
  purchaseDate: string;
  expectedLifespanMonths: number;
  condition: GearCondition;
  minResidualRate: number;
  notes?: string;
};
