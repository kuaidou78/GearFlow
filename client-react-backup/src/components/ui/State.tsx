import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

export function LoadingState({ label = 'Loading data...' }: { label?: string }) {
  return (
    <Card className="flex items-center gap-3 text-sm text-slate-600">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="flex flex-col gap-3 border-red-200 bg-red-50 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
      <span className="inline-flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        {message}
      </span>
      {onRetry ? <Button variant="secondary" onClick={onRetry}>Retry</Button> : null}
    </Card>
  );
}

export function EmptyState({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <Card className="grid place-items-center gap-3 py-12 text-center text-sm text-slate-600">
      <p className="text-base font-semibold text-carbon">{title}</p>
      {action}
    </Card>
  );
}
