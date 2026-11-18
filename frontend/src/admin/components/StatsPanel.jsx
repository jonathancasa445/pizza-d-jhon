import { useEffect, useState } from 'react';
import { getOrderStats } from '../../services/adminOrdersApi';
import { ORDER_STATUSES, statusLabel } from '../../utils/adminOrders';
import { AdminError, AdminLoading } from './AdminState';

export default function StatsPanel({ version, onUnauthorized }) {
  const [retryToken, setRetryToken] = useState(0);
  const [result, setResult] = useState({ key: '', data: null, error: '' });

  const requestKey = `${version}|${retryToken}`;
  const loading = result.key !== requestKey;

  useEffect(() => {
    let cancelled = false;

    getOrderStats()
      .then((data) => {
        if (!cancelled) {
          setResult({ key: requestKey, data, error: '' });
        }
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        if (requestError?.status === 401) {
          onUnauthorized();
          return;
        }

        setResult({
          key: requestKey,
          data: null,
          error: requestError?.message || 'No fue posible cargar las estadísticas.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, onUnauthorized]);

  if (loading) {
    return <AdminLoading message="Cargando resumen…" />;
  }

  if (result.error) {
    return (
      <AdminError
        message={result.error}
        onRetry={() => setRetryToken((token) => token + 1)}
      />
    );
  }

  const stats = result.data;

  if (!stats) {
    return null;
  }

  const cards = [
    { key: 'total', label: 'Total de pedidos', value: stats.total, tone: 'total' },
    {
      key: 'accepted',
      label: 'Pedidos aceptados',
      value: stats.accepted,
      tone: 'accepted',
      note: 'No representa ventas',
    },
    ...ORDER_STATUSES.map((status) => ({
      key: status,
      label: statusLabel(status),
      value: stats.byStatus?.[status] ?? 0,
      tone: status,
    })),
  ];

  const unclassified = stats.byStatus?.unclassified ?? 0;

  if (unclassified > 0) {
    cards.push({
      key: 'unclassified',
      label: 'Sin clasificar',
      value: unclassified,
      tone: 'unclassified',
    });
  }

  return (
    <section className="admin-section" aria-labelledby="admin-stats-title">
      <div className="admin-section-heading">
        <div>
          <p className="admin-eyebrow">Resumen</p>
          <h2 id="admin-stats-title">Estadísticas de pedidos</h2>
        </div>
      </div>

      <div className="admin-stats-grid">
        {cards.map((card) => (
          <article
            key={card.key}
            className={`admin-stat-card admin-stat-card--${card.tone}`}
          >
            <p>{card.label}</p>
            <strong>{card.value}</strong>
            {card.note && <small>{card.note}</small>}
          </article>
        ))}
      </div>
    </section>
  );
}
