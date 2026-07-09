import { Card } from '../ui/Card';

export function KpiCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-alloy">{label}</p>
      <p className="mt-3 text-3xl font-black text-carbon">{value}</p>
      {note ? <p className="mt-2 text-sm text-slate-500">{note}</p> : null}
    </Card>
  );
}
