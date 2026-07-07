import clsx from 'clsx';
import { LogOut, Sparkles } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { businessProfile, navItems } from '../../data/mockData.js';
import Badge from '../common/Badge.jsx';
import Card from '../common/Card.jsx';

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout, profile, user } = useAuth();

  const businessName = profile?.businessName || businessProfile.businessName;
  const ownerName = profile?.ownerName || user?.name || businessProfile.userName;
  const plan = profile?.plan || businessProfile.plan;
  const initial = (ownerName || businessName || 'M').charAt(0).toUpperCase();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="fixed left-4 top-4 z-30 hidden h-[calc(100vh-2rem)] w-72 flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-4 shadow-glass backdrop-blur-2xl lg:flex">
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-sm font-black text-white shadow-soft">
          MP
        </div>
        <div>
          <p className="text-sm font-bold text-slate-950">MSME Pilot</p>
          <p className="text-xs font-medium text-slate-500">Business OS</p>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-1 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (!item.enabled) {
            return (
              <div
                className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-400"
                key={item.label}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                <Badge>Soon</Badge>
              </div>
            );
          }

          return (
            <NavLink
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-slate-950 text-white shadow-soft'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                )
              }
              key={item.label}
              to={item.path}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-5 space-y-3">
        <Card className="bg-gradient-to-br from-indigo-600 to-cyan-500 text-white" padding="sm">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-bold">AI tip</p>
              <p className="mt-1 text-xs leading-5 text-indigo-50">
                Sugar stock may run out in 3 days based on current sales.
              </p>
            </div>
          </div>
        </Card>

        <Card padding="sm" variant="glass">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-950">
                {businessName}
              </p>
              <p className="truncate text-xs text-slate-500">
                {ownerName} - {plan}
              </p>
            </div>
            <button
              aria-label="Logout"
              className="grid h-9 w-9 place-items-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              onClick={handleLogout}
              type="button"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </div>
    </aside>
  );
}
