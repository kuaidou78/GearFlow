import { calculateGearValue, withValuation } from './depreciation.service.js';
import { roundMoney } from '../utils/money.js';

export function summarizeDashboard(gears, maintenance, wishlist, rides = [], bikes = []) {
  const valued = gears.map(withValuation);
  const purchaseTotal = roundMoney(gears.reduce((sum, gear) => sum + Number(gear.purchasePrice), 0));
  const currentValueTotal = roundMoney(valued.reduce((sum, gear) => sum + gear.valuation.currentValue, 0));
  const depreciationTotal = roundMoney(purchaseTotal - currentValueTotal);
  const maintenanceTotal = roundMoney(maintenance.reduce((sum, item) => sum + Number(item.cost), 0));
  const wishlistBudget = roundMoney(wishlist.filter((item) => item.status !== 'purchased').reduce((sum, item) => sum + Number(item.estimatedPrice), 0));
  const rideDistanceTotal = roundMoney(rides.reduce((sum, ride) => sum + Number(ride.distanceKm), 0));
  const rideDurationTotal = rides.reduce((sum, ride) => sum + Number(ride.durationMin), 0);

  const byCategory = Object.values(valued.reduce((acc, gear) => {
    acc[gear.category] ||= { category: gear.category, purchaseValue: 0, currentValue: 0, count: 0 };
    acc[gear.category].purchaseValue += Number(gear.purchasePrice);
    acc[gear.category].currentValue += gear.valuation.currentValue;
    acc[gear.category].count += 1;
    return acc;
  }, {})).map((item) => ({
    ...item,
    purchaseValue: roundMoney(item.purchaseValue),
    currentValue: roundMoney(item.currentValue)
  }));

  const today = new Date();
  const soon = new Date();
  soon.setDate(today.getDate() + 45);
  const upcomingMaintenance = maintenance
    .filter((item) => item.nextDueDate && new Date(item.nextDueDate) <= soon)
    .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate))
    .slice(0, 5);

  return {
    kpis: {
      gearCount: gears.length,
      purchaseTotal,
      currentValueTotal,
      depreciationTotal,
      maintenanceTotal,
      wishlistBudget,
      bikeCount: bikes.length,
      rideCount: rides.length,
      rideDistanceTotal,
      rideDurationTotal
    },
    byCategory,
    recentRides: rides.slice(0, 5),
    bikes: bikes.slice(0, 5),
    recentGear: valued.slice(0, 5),
    upcomingMaintenance,
    highPriorityWishlist: wishlist.filter((item) => item.priority === 'high' && item.status !== 'purchased').slice(0, 5)
  };
}

export function buildInsights(gears, maintenance, wishlist, rides = []) {
  const valued = gears.map((gear) => ({ ...gear, valuation: calculateGearValue(gear) }));
  const purchaseTotal = roundMoney(gears.reduce((sum, gear) => sum + Number(gear.purchasePrice), 0));
  const currentValueTotal = roundMoney(valued.reduce((sum, gear) => sum + gear.valuation.currentValue, 0));

  const categoryAssetShare = Object.values(valued.reduce((acc, gear) => {
    acc[gear.category] ||= { category: gear.category, value: 0, count: 0 };
    acc[gear.category].value += gear.valuation.currentValue;
    acc[gear.category].count += 1;
    return acc;
  }, {})).map((item) => ({
    ...item,
    value: roundMoney(item.value),
    share: currentValueTotal > 0 ? roundMoney(item.value / currentValueTotal) : 0
  }));

  const monthlyMaintenanceCost = Object.values(maintenance.reduce((acc, item) => {
    const month = new Date(item.maintenanceDate).toISOString().slice(0, 7);
    acc[month] ||= { month, cost: 0 };
    acc[month].cost += Number(item.cost);
    return acc;
  }, {})).map((item) => ({ ...item, cost: roundMoney(item.cost) })).sort((a, b) => a.month.localeCompare(b.month));

  const wishlistBudgetDistribution = Object.values(wishlist.reduce((acc, item) => {
    acc[item.priority] ||= { priority: item.priority, budget: 0, count: 0 };
    acc[item.priority].budget += Number(item.estimatedPrice);
    acc[item.priority].count += 1;
    return acc;
  }, {})).map((item) => ({ ...item, budget: roundMoney(item.budget) }));

  const topDepreciation = valued
    .map((gear) => ({
      id: gear.id,
      name: gear.name,
      category: gear.category,
      brand: gear.brand,
      purchasePrice: Number(gear.purchasePrice),
      currentValue: gear.valuation.currentValue,
      depreciationAmount: gear.valuation.depreciationAmount,
      depreciationRate: gear.valuation.depreciationRate
    }))
    .sort((a, b) => b.depreciationAmount - a.depreciationAmount)
    .slice(0, 5);

  const advice = [];
  const overdue = maintenance.filter((item) => item.nextDueDate && new Date(item.nextDueDate) < new Date());
  if (overdue.length > 0) advice.push(`${overdue.length} maintenance item${overdue.length > 1 ? 's are' : ' is'} overdue.`);
  const highWishlist = wishlist.filter((item) => item.priority === 'high' && item.status !== 'purchased').reduce((sum, item) => sum + Number(item.estimatedPrice), 0);
  if (highWishlist > currentValueTotal * 0.25 && currentValueTotal > 0) advice.push('High-priority upgrade budget is above 25% of current asset value.');
  const highestCategory = categoryAssetShare.sort((a, b) => b.share - a.share)[0];
  if (highestCategory?.share > 0.6) advice.push(`${highestCategory.category} assets dominate the garage value. Review risk before the next upgrade.`);
  if (advice.length === 0) advice.push('Asset balance looks healthy. Keep maintenance dates current for sharper planning.');

  const monthlyRideDistance = Object.values(rides.reduce((acc, ride) => {
    const month = new Date(ride.rideDate).toISOString().slice(0, 7);
    acc[month] ||= { month, distanceKm: 0, durationMin: 0, count: 0 };
    acc[month].distanceKm += Number(ride.distanceKm);
    acc[month].durationMin += Number(ride.durationMin);
    acc[month].count += 1;
    return acc;
  }, {})).map((item) => ({ ...item, distanceKm: roundMoney(item.distanceKm) })).sort((a, b) => a.month.localeCompare(b.month));

  const rideDistanceByBike = Object.values(rides.reduce((acc, ride) => {
    const key = ride.bike?.name || 'Unassigned';
    acc[key] ||= { bike: key, distanceKm: 0, count: 0 };
    acc[key].distanceKm += Number(ride.distanceKm);
    acc[key].count += 1;
    return acc;
  }, {})).map((item) => ({ ...item, distanceKm: roundMoney(item.distanceKm) })).sort((a, b) => b.distanceKm - a.distanceKm);

  return {
    assetValueComparison: { purchaseTotal, currentValueTotal, depreciationTotal: roundMoney(purchaseTotal - currentValueTotal) },
    categoryAssetShare,
    monthlyMaintenanceCost,
    wishlistBudgetDistribution,
    monthlyRideDistance,
    rideDistanceByBike,
    topDepreciation,
    advice
  };
}
