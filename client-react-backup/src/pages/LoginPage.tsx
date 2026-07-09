import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Field';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@gearflow.app');
  const [password, setPassword] = useState('ride123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    authApi.me().then(() => navigate('/app/dashboard', { replace: true })).catch(() => undefined);
  }, [navigate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.login(email, password);
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-ceramic p-4">
      <Card className="w-full max-w-md">
        <Link to="/" className="text-sm font-semibold text-chain">GearFlow</Link>
        <h1 className="mt-4 text-3xl font-black tracking-tight">Demo login</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Use the fixed demo account. No registration, payment, or real third-party API is connected.</p>
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
          <Button disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
        </form>
      </Card>
    </main>
  );
}
