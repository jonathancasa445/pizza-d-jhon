export function AdminLoading({ message = 'Cargando…' }) {
  return (
    <div className="admin-state" role="status" aria-live="polite">
      <span className="admin-spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

export function AdminError({ message, onRetry }) {
  return (
    <div className="admin-state admin-state--error" role="alert">
      <p>{message || 'Ocurrió un error. Inténtalo de nuevo.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="admin-secondary-button">
          Reintentar
        </button>
      )}
    </div>
  );
}

export function AdminEmpty({ message }) {
  return (
    <div className="admin-state admin-state--empty">
      <p>{message}</p>
    </div>
  );
}
