import { Bike, BarChart3, Gauge, Heart, LogOut, Menu, Server, Wrench, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { Button } from '../ui/Button';

const nav = [
  { to: '/app/dashboard', label: 'Dashboard', icon: Gauge },
  { to: '/app/gears', label: 'Gear', icon: Bike },
  { to: '/app/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/app/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/app/insights', label: 'Insights', icon: BarChart3 },
  { to: '/app/status', label: 'Status', icon: Server }
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-5">
        <p className="text-xl font-black tracking-tight text-carbon">GearFlow</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-alloy">Garage ledger</p>
      </div>
      <nav className="grid gap-1 p-3">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-blue-50 text-chain' : 'text-slate-600 hover:bg-slate-50 hover:text-carbon'}`
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const active = nav.find((item) => location.pathname.startsWith(item.to))?.label || 'GearFlow';

  async function logout() {
    await authApi.logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-ceramic text-carbon">
      <div className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <Sidebar />
      </div>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/30" onClick={() => setOpen(false)} />
          <div className="relative h-full w-72 max-w-[85vw] bg-white">
            <button className="absolute right-3 top-3 rounded-lg p-2 text-slate-500" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-slate-200 p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-carbon">{active}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-slate-600 sm:inline">demo@gearflow.app</span>
            <Button variant="secondary" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
