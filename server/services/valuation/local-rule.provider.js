import { calculateGearValue } from '../depreciation.service.js';

export function estimateWithLocalRules(gear) {
  const valuation = calculateGearValue(gear);
  const purchasePrice = Number(gear.purchasePrice);

  return {
    method: 'rule_based',
    estimatedValue: valuation.currentValue,
    rangeLow: null,
    rangeHigh: null,
    ruleEstimate: valuation.currentValue,
    marketEstimate: null,
    comparableCount: 0,
    marketProvider: null,
    confidence: 'rule_based',
    retainedRate: purchasePrice > 0 ? valuation.currentValue / purchasePrice : 0,
    valueLoss: valuation.depreciationAmount,
    usedMonths: valuation.usedMonths,
    factors: [
      { key: 'condition', label: 'Condition', value: gear.condition },
      { key: 'used_months', label: 'Used months', value: valuation.usedMonths },
      { key: 'expected_lifespan', label: 'Expected lifespan', value: Number(gear.expectedLifespanMonths) },
      { key: 'residual_rate', label: 'Minimum residual rate', value: Number(gear.minResidualRate) }
    ],
    warnings: []
  };
}
