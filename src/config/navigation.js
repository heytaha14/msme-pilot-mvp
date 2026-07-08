import {
  BarChart3,
  Bell,
  Bot,
  FileScan,
  FileText,
  Gauge,
  Home,
  LineChart,
  PackageSearch,
  Settings,
  Truck,
  User,
  Users,
} from 'lucide-react';

export const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: Home, enabled: true },
  { label: 'Inventory', path: '/inventory', icon: PackageSearch, enabled: true },
  { label: 'Customers', path: '/customers', icon: Users, enabled: true },
  { label: 'Suppliers', path: '/suppliers', icon: Truck, enabled: true },
  { label: 'Sales', path: '/sales', icon: BarChart3, enabled: true },
  { label: 'Invoice Scanner', path: '/invoice-scanner', icon: FileScan, enabled: true },
  { label: 'Invoices', path: '/invoices', icon: FileText, enabled: true },
  { label: 'Reports', path: '/reports', icon: LineChart, enabled: true },
  { label: 'Business Health', path: '/business-health', icon: Gauge, enabled: true },
  { label: 'AI Assistant', path: '/ai-assistant', icon: Bot, enabled: true },
  { label: 'Notifications', path: '/notifications', icon: Bell, enabled: true },
  { label: 'Profile', path: '/profile', icon: User, enabled: true },
  { label: 'Settings', path: '/settings', icon: Settings, enabled: true },
];

export const mobileNavItems = [
  navItems[0],
  navItems[1],
  navItems[2],
  { label: 'Sales', path: '/sales', icon: BarChart3, enabled: true },
  { label: 'AI', path: '/ai-assistant', icon: Bot, enabled: true },
];
