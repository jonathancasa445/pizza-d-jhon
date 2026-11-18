const ORDER_MODALITIES = Object.freeze(['delivery', 'pickup']);

const ORDER_STATUSES = Object.freeze([
  'pending',
  'confirmed',
  'preparing',
  'on_the_way',
  'delivered',
  'cancelled',
]);

const ORDER_STATUS_FLOW = Object.freeze([
  'pending',
  'confirmed',
  'preparing',
  'on_the_way',
  'delivered',
]);

const TERMINAL_ORDER_STATUSES = Object.freeze(['delivered', 'cancelled']);

const ACCEPTED_ORDER_STATUSES = Object.freeze([
  'confirmed',
  'preparing',
  'on_the_way',
  'delivered',
]);

const PICKUP_FORBIDDEN_STATUSES = Object.freeze(['on_the_way']);

const MAX_STATUS_REASON_LENGTH = 300;

// Única fuente del orden normal. Los rangos se derivan del flujo para que
// no puedan divergir; `cancelled` queda fuera del flujo con rango -1.
const STATUS_RANK = Object.freeze({
  ...Object.fromEntries(
    ORDER_STATUS_FLOW.map((status, index) => [status, index])
  ),
  cancelled: -1,
});

const ORDER_CURRENCY = 'USD';

const MAX_ORDER_ITEMS = 50;
const MAX_ORDER_ITEM_QUANTITY = 99;
const MAX_CUSTOMER_NAME_LENGTH = 80;
const MAX_ADDRESS_LENGTH = 200;
const MAX_REFERENCE_LENGTH = 200;
const MAX_OBSERVATIONS_LENGTH = 500;

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function requiresStatusReason(previousStatus, newStatus) {
  if (newStatus === 'cancelled') {
    return true;
  }

  if (TERMINAL_ORDER_STATUSES.includes(previousStatus)) {
    return true;
  }

  const previousRank = STATUS_RANK[previousStatus];
  const nextRank = STATUS_RANK[newStatus];

  return (
    Number.isInteger(previousRank) &&
    Number.isInteger(nextRank) &&
    nextRank < previousRank
  );
}

function buildInitialStatusHistoryEntry(now = new Date()) {
  return {
    previousStatus: null,
    newStatus: 'pending',
    changedBy: 'system',
    changedAt: now,
    reason: '',
  };
}

module.exports = {
  ORDER_MODALITIES,
  ORDER_STATUSES,
  ORDER_STATUS_FLOW,
  TERMINAL_ORDER_STATUSES,
  ACCEPTED_ORDER_STATUSES,
  PICKUP_FORBIDDEN_STATUSES,
  MAX_STATUS_REASON_LENGTH,
  STATUS_RANK,
  requiresStatusReason,
  buildInitialStatusHistoryEntry,
  ORDER_CURRENCY,
  MAX_ORDER_ITEMS,
  MAX_ORDER_ITEM_QUANTITY,
  MAX_CUSTOMER_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
  MAX_REFERENCE_LENGTH,
  MAX_OBSERVATIONS_LENGTH,
  UUID_V4_PATTERN,
  SHA256_PATTERN,
};
