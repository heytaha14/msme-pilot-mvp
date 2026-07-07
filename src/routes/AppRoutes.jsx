import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import AiAssistantPage from '../pages/ai-assistant/AiAssistantPage.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';
import DashboardPage from '../pages/app/DashboardPage.jsx';
import BusinessHealthPage from '../pages/business-health/BusinessHealthPage.jsx';
import CustomersPage from '../pages/customers/CustomersPage.jsx';
import InvoiceScannerPage from '../pages/invoice-scanner/InvoiceScannerPage.jsx';
import InvoicesPage from '../pages/invoices/InvoicesPage.jsx';
import InventoryPage from '../pages/inventory/InventoryPage.jsx';
import ProfilePage from '../pages/profile/ProfilePage.jsx';
import LandingPage from '../pages/public/LandingPage.jsx';
import NotificationsPage from '../pages/notifications/NotificationsPage.jsx';
import ReportsPage from '../pages/reports/ReportsPage.jsx';
import SalesPage from '../pages/sales/SalesPage.jsx';
import SettingsPage from '../pages/settings/SettingsPage.jsx';
import SuppliersPage from '../pages/suppliers/SuppliersPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import PublicRoute from './PublicRoute.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route element={<LandingPage />} path="/" />
        <Route element={<LoginPage />} path="/login" />
        <Route element={<RegisterPage />} path="/register" />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<DashboardPage />} path="/dashboard" />
          <Route element={<InventoryPage />} path="/inventory" />
          <Route element={<CustomersPage />} path="/customers" />
          <Route element={<SuppliersPage />} path="/suppliers" />
          <Route element={<SalesPage />} path="/sales" />
          <Route element={<InvoiceScannerPage />} path="/invoice-scanner" />
          <Route element={<InvoicesPage />} path="/invoices" />
          <Route element={<ReportsPage />} path="/reports" />
          <Route element={<BusinessHealthPage />} path="/business-health" />
          <Route element={<AiAssistantPage />} path="/ai-assistant" />
          <Route element={<NotificationsPage />} path="/notifications" />
          <Route element={<ProfilePage />} path="/profile" />
          <Route element={<SettingsPage />} path="/settings" />
        </Route>
      </Route>

      <Route element={<Navigate replace to="/dashboard" />} path="*" />
    </Routes>
  );
}
