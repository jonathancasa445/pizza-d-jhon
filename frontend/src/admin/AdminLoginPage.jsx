import { useEffect, useState } from 'react';
import { navigate } from '../router';
import { useAdminAuth } from './AdminAuthContext';
import { AdminError, AdminLoading } from './components/AdminState';
import './Admin.css';

export default function AdminLoginPage() {
  const { status, error, login, retry } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/admin', { replace: true });
    }
  }, [status]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      await login({ username, password });
      navigate('/admin', { replace: true });
    } catch (requestError) {
      setFormError(
        requestError?.message || 'No se pudo iniciar sesión. Inténtalo de nuevo.'
      );
    } finally {
      setSubmitting(false);
      setPassword('');
    }
  }

  if (status === 'checking') {
    return <AdminLoading message="Verificando sesión…" />;
  }

  if (status === 'error') {
    return <AdminError message={error} onRetry={retry} />;
  }

  if (status === 'authenticated') {
    return <AdminLoading message="Redirigiendo al panel…" />;
  }

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <p className="admin-eyebrow">Acceso privado</p>
        <h1>Iniciar sesión</h1>
        <p className="admin-login-intro">
          Ingresa tus credenciales para administrar los pedidos.
        </p>

        <label className="admin-field">
          <span>Usuario</span>
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={submitting}
            required
          />
        </label>

        <label className="admin-field">
          <span>Contraseña</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
            required
          />
        </label>

        {formError && (
          <p className="admin-form-error" role="alert">
            {formError}
          </p>
        )}

        <button
          type="submit"
          className="admin-primary-button"
          disabled={submitting}
        >
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>

        <a className="admin-back-link" href="/">
          Volver al sitio público
        </a>
      </form>
    </main>
  );
}
