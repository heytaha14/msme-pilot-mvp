import { Outlet, useLocation } from 'react-router-dom';
import MobileNav from './MobileNav.jsx';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory',
  '/customers': 'Customers',
  '/suppliers': 'Suppliers',
  '/sales': 'Sales',
  '/invoice-scanner': 'Invoice Scanner',
  '/invoices': 'Invoices',
  '/reports': 'Reports',
  '/business-health': 'Business Health',
  '/ai-assistant': 'AI Assistant',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
  '/settings': 'Settings',
};

export default function AppLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Dashboard';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.10),_transparent_32rem),linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_100%)] text-slate-950">
      <Sidebar />
      <div className="lg:pl-80">
        <Topbar title={title} />
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
