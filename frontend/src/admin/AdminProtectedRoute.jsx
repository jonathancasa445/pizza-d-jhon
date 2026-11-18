import { useEffect } from 'react';
import { navigate } from '../router';
import { useAdminAuth } from './AdminAuthContext';
import { AdminError, AdminLoading } from './components/AdminState';

export default function AdminProtectedRoute({ children }) {
  const { status, error, retry } = useAdminAuth();

  useEffect(() => {
    if (status === 'anonymous') {
      navigate('/admin/login', { replace: true });
    }
  }, [status]);

  if (status === 'checking') {
    return <AdminLoading message="Verificando sesión…" />;
  }

  if (status === 'error') {
    return <AdminError message={error} onRetry={retry} />;
  }

  if (status !== 'authenticated') {
    return null;
  }

  return children;
}
