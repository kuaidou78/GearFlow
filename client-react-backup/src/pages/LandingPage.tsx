import { ArrowRight, Bike, Server, ShieldCheck, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { statusApi } from '../api/statusApi';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function LandingPage() {
  const [apiOnline, setApiOnline] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    statusApi.health().then(() => setApiOnline('online')).catch(() => setApiOnline('offline'));
  }, []);

  return (
    <main className="min-h-screen bg-ceramic text-carbon">
      <section className="asset-grid border-b border-slate-200 bg-white">
        <div className="mx-auto grid min-h-[88vh] max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-chain">
              Cycling asset control
            </div>
            <h1 className="max-w-3xl text-5xl font-black tracking-tight text-carbon sm:text-6xl">
              GearFlow
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              A garage-grade asset ledger for bikes, wheelsets, helmets, computers, apparel, maintenance spend, and upgrade plans.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login">
                <Button>
                  View demo <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <span className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold ${apiOnline === 'online' ? 'bg-emerald-50 text-emerald-700' : apiOnline === 'offline' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                API {apiOnline}
              </span>
            </div>
          </div>
          <div className="grid gap-4">
            {[
              ['Tarmac SL8 Comp', 'bike', '¥35,800', 'current ¥29,612'],
              ['Aeolus Pro 51', 'wheelset', '¥9,800', 'sealant due soon'],
              ['Edge 1050', 'computer', '¥5,480', 'excellent condition']
            ].map((item) => (
              <Card key={item[0]} className="border-l-4 border-l-chain">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-alloy">{item[1]}</p>
                    <h2 className="mt-2 text-xl font-black">{item[0]}</h2>
                  </div>
                  <p className="text-right text-sm font-bold text-chain">{item[2]}</p>
                </div>
                <p className="mt-5 text-sm text-slate-600">{item[3]}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-12 md:grid-cols-4">
        {[
          [Bike, 'Gear ledger', 'Track bikes, wheelsets, computers, helmets, shoes, clothing, and tools.'],
          [Wrench, 'Maintenance memory', 'Record service dates, costs, notes, and next-due reminders.'],
          [ShieldCheck, 'Depreciation view', 'Estimate current value from price, age, lifespan, condition, and residual rate.'],
          [Server, 'Deployable stack', 'Express, Prisma, SQLite, Nginx, and PM2 without Docker.']
        ].map(([Icon, title, copy]) => {
          const TypedIcon = Icon as typeof Bike;
          return (
            <Card key={String(title)}>
              <TypedIcon className="h-5 w-5 text-chain" />
              <h3 className="mt-4 font-bold">{title as string}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{copy as string}</p>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
