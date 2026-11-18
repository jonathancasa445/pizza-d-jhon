const { serializeOrder } = require('./orderService');

function toPlainOrder(order) {
  return order && typeof order.toObject === 'function'
    ? order.toObject({ virtuals: false, versionKey: false })
    : order;
}

function serializeAdminOrder(order) {
  const plain = toPlainOrder(order);

  return {
    ...serializeOrder(order),
    updatedAt: plain?.updatedAt,
  };
}

function serializeStatusHistoryEntry(entry = {}) {
  return {
    previousStatus: entry.previousStatus ?? null,
    newStatus: entry.newStatus,
    changedBy: entry.changedBy,
    changedAt: entry.changedAt,
    reason: entry.reason ?? '',
  };
}

function serializeAdminOrderDetail(order) {
  const plain = toPlainOrder(order);

  return {
    ...serializeAdminOrder(order),
    statusHistory: Array.isArray(plain?.statusHistory)
      ? plain.statusHistory.map(serializeStatusHistoryEntry)
      : [],
  };
}

module.exports = {
  serializeAdminOrder,
  serializeAdminOrderDetail,
  serializeStatusHistoryEntry,
};
