import { Bell, FileScan, Search, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';

export default function Topbar({ title }) {
  const { profile, user } = useAuth();
  const ownerName = profile?.ownerName || user?.name || user?.email || 'Owner';
  const businessName = profile?.businessName || 'MSME Pilot';
  const initial = ownerName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-slate-50/80 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
            {businessName}
          </p>
          <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-950">
            {title}
          </h1>
        </div>

        <div className="hidden w-full max-w-sm md:block">
          <Input
            aria-label="Search"
            icon={Search}
            name="search"
            placeholder="Search products, invoices, customers"
          />
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <Button as={Link} size="sm" to="/invoice-scanner">
            <FileScan className="h-4 w-4" />
            Scan Invoice
          </Button>
          <Link
            aria-label="Notifications"
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-950"
            to="/notifications"
          >
            <Bell className="h-4 w-4" />
          </Link>
          <Link
            aria-label="Settings"
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-950"
            to="/settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <Link
            aria-label="Profile"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-950 text-sm font-bold text-white transition hover:bg-indigo-700"
            to="/profile"
          >
            {initial}
          </Link>
        </div>
      </div>
    </header>
  );
}
