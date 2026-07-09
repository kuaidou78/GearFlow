import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { LoadingState } from '../ui/State';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'authed' | 'guest'>('loading');

  useEffect(() => {
    authApi.me().then(() => setStatus('authed')).catch(() => setStatus('guest'));
  }, []);

  if (status === 'loading') return <main className="p-6"><LoadingState label="Checking demo session..." /></main>;
  if (status === 'guest') return <Navigate to="/login" replace />;
  return <>{children}</>;
}
