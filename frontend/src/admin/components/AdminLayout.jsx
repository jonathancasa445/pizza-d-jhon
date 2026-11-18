import { useState } from 'react';
import { navigate } from '../../router';

export default function AdminLayout({ admin, onLogout, children }) {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await onLogout();
    } finally {
      navigate('/', { replace: true });
      setLoggingOut(false);
    }
  }

  return (
    <div className="admin-app">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">Pizza D' Jhon</p>
          <h1>Panel administrativo</h1>
        </div>

        <div className="admin-header-actions">
          <span className="admin-header-user">
            {admin?.username || 'Administrador'}
          </span>
          <a href="/">Ver sitio público</a>
          <button
            type="button"
            className="admin-secondary-button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
        </div>
      </header>

      <main className="admin-main">{children}</main>

      <footer className="admin-footer">
        <p>Panel privado · Solo personal autorizado</p>
      </footer>
    </div>
  );
}
