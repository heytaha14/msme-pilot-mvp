import { Navigate, Outlet, useLocation } from 'react-router-dom';
import AuthLoadingScreen from '../components/common/AuthLoadingScreen.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute() {
  const location = useLocation();
  const { authReady, isAuthenticated, loading } = useAuth();

  if (!authReady || loading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Outlet />;
}
