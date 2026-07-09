import { roundMoney } from '../utils/money.js';

const CONDITION_FACTORS = {
  new: 1,
  excellent: 0.9,
  good: 0.78,
  fair: 0.62,
  poor: 0.45
};

function monthsBetween(startDate, endDate = new Date()) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  return Math.max(0, months);
}

export function calculateGearValue(gear) {
  const purchasePrice = Number(gear.purchasePrice);
  const expectedMonths = Math.max(1, Number(gear.expectedLifespanMonths || 1));
  const minResidualRate = Math.min(1, Math.max(0, Number(gear.minResidualRate || 0)));
  const usedMonths = monthsBetween(gear.purchaseDate);
  const usageProgress = Math.min(1, usedMonths / expectedMonths);
  const timeValueRate = 1 - usageProgress * (1 - minResidualRate);
  const conditionFactor = CONDITION_FACTORS[gear.condition] ?? CONDITION_FACTORS.good;
  const rawValue = purchasePrice * timeValueRate * conditionFactor;
  const floorValue = purchasePrice * minResidualRate;
  const currentValue = roundMoney(Math.max(rawValue, floorValue));
  const depreciationAmount = roundMoney(Math.max(0, purchasePrice - currentValue));
  const depreciationRate = purchasePrice > 0 ? roundMoney(depreciationAmount / purchasePrice) : 0;

  return {
    currentValue,
    depreciationAmount,
    depreciationRate,
    usedMonths
  };
}

export function withValuation(gear) {
  return {
    ...gear,
    valuation: calculateGearValue(gear)
  };
}
