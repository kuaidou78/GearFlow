import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Status, statusApi } from '../api/statusApi';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState, LoadingState } from '../components/ui/State';

export function StatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await statusApi.status();
      setStatus(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status check failed.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState label="Checking deployment status..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Deployment status</h2>
          <p className="mt-1 text-sm text-slate-600">API and SQLite health from the live Express service.</p>
        </div>
        <Button variant="secondary" onClick={load}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {status ? Object.entries(status).map(([key, value]) => (
          <Card key={key}>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-alloy">{key}</p>
            <p className="mt-3 break-words text-lg font-black text-carbon">{String(value)}</p>
          </Card>
        )) : null}
      </div>
    </div>
  );
}
