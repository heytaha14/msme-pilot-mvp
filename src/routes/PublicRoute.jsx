import { Navigate, Outlet } from 'react-router-dom';
import AuthLoadingScreen from '../components/common/AuthLoadingScreen.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function PublicRoute() {
  const { authReady, isAuthenticated, loading } = useAuth();

  if (!authReady || loading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}
