import { formatCurrency, percent } from '../../utils/formatters';

export function SimpleBars({ rows, valueKey = 'value', labelKey = 'label', currency = true }: { rows: Array<Record<string, string | number>>; valueKey?: string; labelKey?: string; currency?: boolean }) {
  const max = Math.max(1, ...rows.map((row) => Number(row[valueKey] || 0)));

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">No data yet.</p>;
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => {
        const value = Number(row[valueKey] || 0);
        return (
          <div key={String(row[labelKey])}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="font-semibold text-carbon">{String(row[labelKey])}</span>
              <span className="text-slate-600">{currency ? formatCurrency(value) : percent(value)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-chain" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
