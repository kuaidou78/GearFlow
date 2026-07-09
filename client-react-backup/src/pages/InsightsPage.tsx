import { useEffect, useState } from 'react';
import { insightsApi } from '../api/insightsApi';
import { SimpleBars } from '../components/charts/SimpleBars';
import { KpiCard } from '../components/dashboard/KpiCard';
import { Card } from '../components/ui/Card';
import { ErrorState, LoadingState } from '../components/ui/State';
import { InsightsOverview } from '../types/insights';
import { formatCurrency, percent } from '../utils/formatters';

export function InsightsPage() {
  const [data, setData] = useState<InsightsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await insightsApi.overview();
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Insights failed to load.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState label="Calculating insights..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black">Insights</h2>
        <p className="mt-1 text-sm text-slate-600">Five fixed modules calculated from live SQLite data.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Purchase total" value={formatCurrency(data.assetValueComparison.purchaseTotal)} />
        <KpiCard label="Current estimate" value={formatCurrency(data.assetValueComparison.currentValueTotal)} />
        <KpiCard label="Lost to depreciation" value={formatCurrency(data.assetValueComparison.depreciationTotal)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h3 className="text-lg font-bold">Category asset share</h3>
          <div className="mt-5">
            <SimpleBars rows={data.categoryAssetShare.map((row) => ({ label: `${row.category} (${row.count})`, value: row.share }))} currency={false} />
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-bold">Monthly maintenance cost</h3>
          <div className="mt-5">
            <SimpleBars rows={data.monthlyMaintenanceCost.map((row) => ({ label: row.month, value: row.cost }))} />
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-bold">Wishlist budget distribution</h3>
          <div className="mt-5">
            <SimpleBars rows={data.wishlistBudgetDistribution.map((row) => ({ label: `${row.priority} (${row.count})`, value: row.budget }))} />
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-bold">Top 5 depreciation</h3>
          <div className="mt-4 grid gap-3">
            {data.topDepreciation.length === 0 ? <p className="text-sm text-slate-500">No depreciation data yet.</p> : data.topDepreciation.map((gear) => (
              <div key={gear.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex justify-between gap-3">
                  <p className="font-semibold">{gear.name}</p>
                  <p className="font-bold text-chain">{formatCurrency(gear.depreciationAmount)}</p>
                </div>
                <p className="mt-1 text-sm text-slate-500">{gear.brand} · {gear.category} · {percent(gear.depreciationRate)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <h3 className="text-lg font-bold">Asset health rules</h3>
        <div className="mt-4 grid gap-2">
          {data.advice.map((item) => (
            <p key={item} className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">{item}</p>
          ))}
        </div>
      </Card>
    </div>
  );
}
