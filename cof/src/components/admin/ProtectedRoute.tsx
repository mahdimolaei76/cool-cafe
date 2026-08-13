import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: ('admin' | 'cashier')[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    // اگر نقش دسترسی نداره، به صفحه مخصوص خودش هدایت کن
    if (user.role === 'cashier') {
      return <Navigate to="/cashier" replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
