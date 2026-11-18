import { useEffect, useState } from 'react';
import { listOrders } from '../../services/adminOrdersApi';
import {
  ORDER_STATUSES,
  formatDateTime,
  modalityLabel,
  statusLabel,
} from '../../utils/adminOrders';
import { AdminEmpty, AdminError, AdminLoading } from './AdminState';
import StatusBadge from './StatusBadge';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const EMPTY_RESULT = { key: '', data: null, error: '' };

export default function OrdersList({
  version,
  selectedOrderId,
  onSelect,
  onUnauthorized,
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [retryToken, setRetryToken] = useState(0);
  const [result, setResult] = useState(EMPTY_RESULT);

  const requestKey = `${version}|${statusFilter}|${page}|${limit}|${retryToken}`;
  const loading = result.key !== requestKey;

  useEffect(() => {
    let cancelled = false;

    listOrders({ status: statusFilter, page, limit })
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
          error: requestError?.message || 'No fue posible cargar los pedidos.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, statusFilter, page, limit, onUnauthorized]);

  function handleStatusFilter(event) {
    setStatusFilter(event.target.value);
    setPage(1);
  }

  function handleLimit(event) {
    setLimit(Number(event.target.value));
    setPage(1);
  }

  const pagination = result.data?.pagination ?? null;
  const items = Array.isArray(result.data?.items) ? result.data.items : [];

  return (
    <section className="admin-section" aria-labelledby="admin-orders-title">
      <div className="admin-section-heading">
        <div>
          <p className="admin-eyebrow">Pedidos</p>
          <h2 id="admin-orders-title">Listado de pedidos</h2>
        </div>

        <div className="admin-filters">
          <label className="admin-field admin-field--inline">
            <span>Estado</span>
            <select value={statusFilter} onChange={handleStatusFilter}>
              <option value="all">Todos</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field admin-field--inline">
            <span>Por página</span>
            <select value={limit} onChange={handleLimit}>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading && <AdminLoading message="Cargando pedidos…" />}

      {!loading && result.error && (
        <AdminError
          message={result.error}
          onRetry={() => setRetryToken((token) => token + 1)}
        />
      )}

      {!loading && !result.error && items.length === 0 && (
        <AdminEmpty message="No hay pedidos para mostrar con este filtro." />
      )}

      {!loading && !result.error && items.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Modalidad</th>
                <th>Estado</th>
                <th>
                  <span className="admin-visually-hidden">Acción</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((order) => (
                <tr
                  key={order.orderId}
                  className={
                    selectedOrderId === order.orderId
                      ? 'admin-table-row is-selected'
                      : 'admin-table-row'
                  }
                >
                  <td>
                    <span className="admin-order-id" title={order.orderId}>
                      {order.orderId}
                    </span>
                  </td>
                  <td>{order.customer?.name || '—'}</td>
                  <td>{formatDateTime(order.createdAt)}</td>
                  <td>{modalityLabel(order.modality)}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-link-button"
                      onClick={() => onSelect(order.orderId)}
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !result.error && pagination && (
        <div className="admin-pagination">
          <button
            type="button"
            className="admin-secondary-button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
          >
            Anterior
          </button>

          <span>
            Página {pagination.page} de {Math.max(pagination.pages, 1)} ·{' '}
            {pagination.total} pedido(s)
          </span>

          <button
            type="button"
            className="admin-secondary-button"
            onClick={() =>
              setPage((current) =>
                current < pagination.pages ? current + 1 : current
              )
            }
            disabled={page >= pagination.pages}
          >
            Siguiente
          </button>
        </div>
      )}
    </section>
  );
}
