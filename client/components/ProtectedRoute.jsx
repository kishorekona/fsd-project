import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="route-loading" role="status">Checking your session…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return <Outlet />;
}