// Reflejo de las reglas de backend/src/constants/order.js para la interfaz.
// El servidor sigue siendo la autoridad final al validar cada cambio.
export const ORDER_STATUSES = Object.freeze([
  'pending',
  'confirmed',
  'preparing',
  'on_the_way',
  'delivered',
  'cancelled',
]);

export const STATUS_LABELS = Object.freeze({
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
});

const STATUS_RANK = Object.freeze({
  pending: 0,
  confirmed: 1,
  preparing: 2,
  on_the_way: 3,
  delivered: 4,
  cancelled: -1,
});

const TERMINAL_STATUSES = Object.freeze(['delivered', 'cancelled']);

export const MAX_REASON_LENGTH = 300;

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? 'Sin clasificar';
}

export function requiresReason(currentStatus, newStatus) {
  if (newStatus === 'cancelled') {
    return true;
  }

  if (TERMINAL_STATUSES.includes(currentStatus)) {
    return true;
  }

  const previousRank = STATUS_RANK[currentStatus];
  const nextRank = STATUS_RANK[newStatus];

  return (
    Number.isInteger(previousRank) &&
    Number.isInteger(nextRank) &&
    nextRank < previousRank
  );
}

export function isTransitionAllowed(currentStatus, newStatus, modality) {
  if (!ORDER_STATUSES.includes(currentStatus)) {
    return false;
  }

  if (!ORDER_STATUSES.includes(newStatus) || newStatus === currentStatus) {
    return false;
  }

  if (modality === 'pickup' && newStatus === 'on_the_way') {
    return false;
  }

  return true;
}

export function modalityLabel(modality) {
  return modality === 'pickup' ? 'Retiro' : modality === 'delivery' ? 'Domicilio' : '—';
}

export function formatDateTime(value) {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    return '—';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
