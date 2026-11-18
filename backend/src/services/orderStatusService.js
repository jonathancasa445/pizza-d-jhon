const {
  ORDER_STATUSES,
  PICKUP_FORBIDDEN_STATUSES,
  MAX_STATUS_REASON_LENGTH,
  requiresStatusReason,
} = require('../constants/order');
const { OrderManagementError } = require('./orderManagementErrors');
const { orderAdminRepository } = require('./adminOrderService');
const { serializeAdminOrderDetail } = require('./orderAdminSerializer');

function assertNonEmptyString(value, label, code) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new OrderManagementError(`${label} es obligatorio.`, code);
  }

  return value.trim();
}

function normalizeReason(reason, required) {
  const text = reason === undefined || reason === null ? '' : reason;

  if (typeof text !== 'string') {
    throw new OrderManagementError(
      'El motivo debe ser texto.',
      'INVALID_REASON'
    );
  }

  // El límite de 300 caracteres se aplica al motivo normalizado: primero se
  // recortan espacios marginales con trim() y después se mide su longitud.
  const trimmed = text.trim();

  if (trimmed.length > MAX_STATUS_REASON_LENGTH) {
    throw new OrderManagementError(
      `El motivo no puede superar ${MAX_STATUS_REASON_LENGTH} caracteres.`,
      'INVALID_REASON'
    );
  }

  if (required && !trimmed) {
    throw new OrderManagementError(
      'El motivo es obligatorio para este cambio de estado.',
      'REASON_REQUIRED'
    );
  }

  return trimmed;
}

function validateStatusChange({ currentStatus, newStatus, modality, reason }) {
  if (!ORDER_STATUSES.includes(newStatus)) {
    throw new OrderManagementError(
      'El nuevo estado no es válido.',
      'INVALID_STATUS'
    );
  }

  if (!ORDER_STATUSES.includes(currentStatus)) {
    throw new OrderManagementError(
      'El estado actual del pedido no es válido.',
      'INVALID_CURRENT_STATUS',
      409
    );
  }

  if (newStatus === currentStatus) {
    throw new OrderManagementError(
      'El pedido ya se encuentra en ese estado.',
      'NO_STATUS_CHANGE'
    );
  }

  if (
    modality === 'pickup' &&
    PICKUP_FORBIDDEN_STATUSES.includes(newStatus)
  ) {
    throw new OrderManagementError(
      'Los pedidos de retiro no pueden pasar por on_the_way.',
      'INVALID_STATUS_FOR_MODALITY'
    );
  }

  return normalizeReason(reason, requiresStatusReason(currentStatus, newStatus));
}

function buildStatusHistoryEntry({
  previousStatus,
  newStatus,
  changedBy,
  reason,
  changedAt,
}) {
  return {
    previousStatus,
    newStatus,
    changedBy,
    changedAt,
    reason,
  };
}

async function changeOrderStatus({
  orderId,
  status,
  reason,
  adminId,
  repository = orderAdminRepository,
  now = () => new Date(),
} = {}) {
  const normalizedOrderId = assertNonEmptyString(
    orderId,
    'El identificador del pedido',
    'INVALID_ORDER_ID'
  );
  const normalizedAdminId = assertNonEmptyString(
    adminId,
    'El identificador del administrador',
    'INVALID_ADMIN_ID'
  );

  const currentOrder = await repository.findById(normalizedOrderId);

  if (!currentOrder) {
    throw new OrderManagementError(
      'Pedido no encontrado.',
      'ORDER_NOT_FOUND',
      404
    );
  }

  const normalizedReason = validateStatusChange({
    currentStatus: currentOrder.status,
    newStatus: status,
    modality: currentOrder.modality,
    reason,
  });

  const changedAt = now();
  const entry = buildStatusHistoryEntry({
    previousStatus: currentOrder.status,
    newStatus: status,
    changedBy: normalizedAdminId,
    reason: normalizedReason,
    changedAt,
  });

  const updatedOrder = await repository.updateStatus({
    orderId: normalizedOrderId,
    expectedStatus: currentOrder.status,
    status,
    entry,
    updatedAt: changedAt,
  });

  if (!updatedOrder) {
    throw new OrderManagementError(
      'El pedido cambió de estado mientras se actualizaba.',
      'ORDER_STATUS_CONFLICT',
      409
    );
  }

  return serializeAdminOrderDetail(updatedOrder);
}

module.exports = {
  OrderManagementError: require('./orderManagementErrors').OrderManagementError,
  buildStatusHistoryEntry,
  changeOrderStatus,
  normalizeReason,
  validateStatusChange,
};
