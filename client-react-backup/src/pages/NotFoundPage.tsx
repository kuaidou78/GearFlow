import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-ceramic p-6 text-center">
      <div>
        <h1 className="text-4xl font-black text-carbon">Page not found</h1>
        <p className="mt-3 text-slate-600">The route does not exist in GearFlow.</p>
        <Link to="/" className="mt-6 inline-block">
          <Button>Back home</Button>
        </Link>
      </div>
    </main>
  );
}
