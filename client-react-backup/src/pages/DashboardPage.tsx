import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/dashboardApi';
import { KpiCard } from '../components/dashboard/KpiCard';
import { SimpleBars } from '../components/charts/SimpleBars';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/State';
import { DashboardSummary } from '../types/dashboard';
import { formatCurrency, formatDate } from '../utils/formatters';

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await dashboardApi.summary();
      setSummary(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dashboard failed to load.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!summary || summary.kpis.gearCount === 0) {
    return <EmptyState title="No gear in the garage yet." action={<Link to="/app/gears"><Button>Add first gear</Button></Link>} />;
  }

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black">Garage overview</h2>
        <p className="mt-1 text-sm text-slate-600">Live totals from SQLite, including depreciation and upgrade budget.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Gear count" value={String(summary.kpis.gearCount)} />
        <KpiCard label="Purchase total" value={formatCurrency(summary.kpis.purchaseTotal)} />
        <KpiCard label="Current value" value={formatCurrency(summary.kpis.currentValueTotal)} />
        <KpiCard label="Depreciation" value={formatCurrency(summary.kpis.depreciationTotal)} />
        <KpiCard label="Maintenance spend" value={formatCurrency(summary.kpis.maintenanceTotal)} />
        <KpiCard label="Wishlist budget" value={formatCurrency(summary.kpis.wishlistBudget)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h3 className="text-lg font-bold">Asset value by category</h3>
          <div className="mt-5">
            <SimpleBars rows={summary.byCategory.map((item) => ({ label: item.category, value: item.currentValue }))} />
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-bold">Recent gear</h3>
          <div className="mt-4 grid gap-3">
            {summary.recentGear.map((gear) => (
              <div key={gear.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
                <div>
                  <p className="font-semibold">{gear.name}</p>
                  <p className="text-sm text-slate-500">{gear.brand} · {gear.category}</p>
                </div>
                <p className="text-sm font-bold text-chain">{formatCurrency(gear.valuation.currentValue)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-bold">Upcoming maintenance</h3>
          <div className="mt-4 grid gap-3">
            {summary.upcomingMaintenance.length === 0 ? <p className="text-sm text-slate-500">No due items in the next 45 days.</p> : summary.upcomingMaintenance.map((item) => (
              <div key={item.id} className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                <p className="font-semibold text-carbon">{item.title}</p>
                <p className="text-sm text-slate-600">{item.gear?.name} · due {formatDate(item.nextDueDate)}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-bold">High-priority wishlist</h3>
          <div className="mt-4 grid gap-3">
            {summary.highPriorityWishlist.length === 0 ? <p className="text-sm text-slate-500">No high-priority upgrades.</p> : summary.highPriorityWishlist.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm font-bold text-chain">{formatCurrency(item.estimatedPrice)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
