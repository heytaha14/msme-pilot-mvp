import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import { mobileNavItems } from '../../data/mockData.js';

export default function MobileNav() {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-white/70 bg-white/90 px-2 py-2 shadow-glass backdrop-blur-2xl lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;

          if (!item.enabled) {
            return (
              <button
                className="flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold text-slate-400"
                disabled
                key={item.label}
                type="button"
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          }

          return (
            <NavLink
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold transition-all',
                  isActive
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950',
                )
              }
              key={item.label}
              to={item.path}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
