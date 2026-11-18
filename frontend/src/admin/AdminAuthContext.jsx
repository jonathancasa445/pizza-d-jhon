import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getSession,
  login as loginRequest,
  logout as logoutRequest,
  resetCsrfToken,
} from '../services/adminAuthApi';

export const AdminAuthContext = createContext(null);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error('useAdminAuth debe usarse dentro de AdminAuthProvider');
  }

  return context;
}

export function AdminAuthProvider({ children }) {
  const [status, setStatus] = useState('checking');
  const [admin, setAdmin] = useState(null);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getSession()
      .then((sessionAdmin) => {
        if (cancelled) {
          return;
        }

        setAdmin(sessionAdmin);
        setStatus('authenticated');
        setError('');
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        setAdmin(null);

        if (requestError?.status === 401) {
          setStatus('anonymous');
          setError('');
          return;
        }

        setError(
          requestError?.message || 'No fue posible verificar la sesión.'
        );
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const login = useCallback(async ({ username, password }) => {
    const sessionAdmin = await loginRequest({ username, password });

    setAdmin(sessionAdmin);
    setStatus('authenticated');
    setError('');

    return sessionAdmin;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      resetCsrfToken();
      setAdmin(null);
      setStatus('anonymous');
      setError('');
    }
  }, []);

  const markUnauthorized = useCallback(() => {
    resetCsrfToken();
    setAdmin(null);
    setStatus('anonymous');
    setError('');
  }, []);

  const retry = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const value = useMemo(
    () => ({ status, admin, error, login, logout, markUnauthorized, retry }),
    [status, admin, error, login, logout, markUnauthorized, retry]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}
