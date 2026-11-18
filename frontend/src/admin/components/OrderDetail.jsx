import { useState } from 'react';
import { formatCents } from '../../utils/money';
import {
  MAX_REASON_LENGTH,
  ORDER_STATUSES,
  formatDateTime,
  isTransitionAllowed,
  modalityLabel,
  requiresReason,
  statusLabel,
} from '../../utils/adminOrders';
import { AdminError, AdminLoading } from './AdminState';
import StatusBadge from './StatusBadge';

export default function OrderDetail({
  order,
  loading,
  error,
  onClose,
  onRetry,
  onStatusChange,
  updating,
  updateError,
}) {
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!order && !loading && !error) {
    return null;
  }

  const currentStatus = order?.status;
  const modality = order?.modality;
  const isKnownStatus = ORDER_STATUSES.includes(currentStatus);
  const reasonRequired = requiresReason(currentStatus, newStatus);
  const canSubmit =
    Boolean(newStatus) &&
    isTransitionAllowed(currentStatus, newStatus, modality) &&
    (!reasonRequired || reason.trim().length > 0) &&
    (newStatus !== 'cancelled' || confirmCancel);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit || updating) {
      return;
    }

    const success = await onStatusChange({
      status: newStatus,
      reason: reason.trim(),
    });

    if (success) {
      setNewStatus('');
      setReason('');
      setConfirmCancel(false);
    }
  }

  return (
    <section className="admin-section admin-detail" aria-labelledby="admin-detail-title">
      <div className="admin-section-heading">
        <div>
          <p className="admin-eyebrow">Detalle</p>
          <h2 id="admin-detail-title">Pedido {order?.orderId ?? ''}</h2>
        </div>
        <button type="button" className="admin-secondary-button" onClick={onClose}>
          Cerrar detalle
        </button>
      </div>

      {loading && <AdminLoading message="Cargando detalle…" />}

      {error && <AdminError message={error} onRetry={onRetry} />}

      {order && !loading && (
        <>
          <div className="admin-detail-summary">
            <div>
              <span>Estado actual</span>
              <StatusBadge status={order.status} />
            </div>
            <div>
              <span>Cliente</span>
              <strong>{order.customer?.name || '—'}</strong>
            </div>
            <div>
              <span>Modalidad</span>
              <strong>{modalityLabel(order.modality)}</strong>
            </div>
            <div>
              <span>Creado</span>
              <strong>{formatDateTime(order.createdAt)}</strong>
            </div>
          </div>

          {!isKnownStatus && (
            <p className="admin-form-error" role="alert">
              El estado actual no es reconocido. No se puede actualizar este pedido.
            </p>
          )}

          <div className="admin-detail-columns">
            <div className="admin-detail-block">
              <h3>Entrega y observaciones</h3>
              <dl className="admin-definition-list">
                <div>
                  <dt>Dirección</dt>
                  <dd>
                    {order.modality === 'delivery' && order.address
                      ? order.address
                      : 'No aplica'}
                  </dd>
                </div>
                <div>
                  <dt>Referencia</dt>
                  <dd>{order.reference || '—'}</dd>
                </div>
                <div>
                  <dt>Observaciones</dt>
                  <dd>{order.observations || '—'}</dd>
                </div>
                <div>
                  <dt>Última actualización</dt>
                  <dd>{formatDateTime(order.updatedAt)}</dd>
                </div>
              </dl>

              <h3>Productos</h3>
              <ul className="admin-product-list">
                {(order.items ?? []).map((item, index) => (
                  <li key={`${item.productKey}-${index}`}>
                    <div className="admin-product-head">
                      <strong>
                        {item.quantity} × {item.productName || item.productKey}
                      </strong>
                      <span>{formatCents(item.lineTotalCents)}</span>
                    </div>
                    <small>
                      {item.presentationName || item.presentationKey} · Precio
                      unitario {formatCents(item.unitPriceCents)}
                    </small>
                    {Array.isArray(item.flavors) && item.flavors.length > 0 && (
                      <small>
                        Sabores: {item.flavors.map((flavor) => flavor.name).join(', ')}
                      </small>
                    )}
                    {Array.isArray(item.addons) && item.addons.length > 0 && (
                      <small>
                        Adicionales:{' '}
                        {item.addons
                          .map((addon) => `${addon.quantity} × ${addon.name}`)
                          .join(', ')}
                      </small>
                    )}
                  </li>
                ))}
              </ul>

              <div className="admin-totals">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatCents(order.subtotalCents)}</strong>
                </div>
                <div className="admin-totals-grand">
                  <span>Total</span>
                  <strong>{formatCents(order.totalCents)}</strong>
                </div>
              </div>
            </div>

            <div className="admin-detail-block">
              <h3>Actualizar estado</h3>
              <form className="admin-status-form" onSubmit={handleSubmit}>
                <label className="admin-field">
                  <span>Nuevo estado</span>
                  <select
                    value={newStatus}
                    onChange={(event) => {
                      setNewStatus(event.target.value);
                      setConfirmCancel(false);
                    }}
                    disabled={!isKnownStatus || updating}
                  >
                    <option value="">Seleccionar…</option>
                    {ORDER_STATUSES.filter(
                      (status) =>
                        status !== currentStatus &&
                        isTransitionAllowed(currentStatus, status, modality)
                    ).map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>

                {reasonRequired && (
                  <label className="admin-field">
                    <span>Motivo (obligatorio)</span>
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      maxLength={MAX_REASON_LENGTH}
                      rows={3}
                      disabled={updating}
                      required
                    />
                    <small>
                      {reason.length}/{MAX_REASON_LENGTH} caracteres
                    </small>
                  </label>
                )}

                {newStatus === 'cancelled' && (
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={confirmCancel}
                      onChange={(event) => setConfirmCancel(event.target.checked)}
                      disabled={updating}
                    />
                    <span>Confirmo que deseo cancelar este pedido.</span>
                  </label>
                )}

                {updateError && (
                  <p className="admin-form-error" role="alert">
                    {updateError}
                  </p>
                )}

                <button
                  type="submit"
                  className="admin-primary-button"
                  disabled={!canSubmit || updating}
                >
                  {updating ? 'Actualizando…' : 'Guardar cambio de estado'}
                </button>
              </form>

              <h3>Historial de estados</h3>
              <div className="admin-table-wrap">
                <table className="admin-table admin-history-table">
                  <thead>
                    <tr>
                      <th>Anterior</th>
                      <th>Nuevo</th>
                      <th>Fecha</th>
                      <th>Responsable</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.statusHistory ?? []).map((entry, index) => (
                      <tr key={`${entry.changedAt}-${index}`}>
                        <td>{statusLabel(entry.previousStatus)}</td>
                        <td>
                          <StatusBadge status={entry.newStatus} />
                        </td>
                        <td>{formatDateTime(entry.changedAt)}</td>
                        <td className="admin-order-id">{entry.changedBy}</td>
                        <td>{entry.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
