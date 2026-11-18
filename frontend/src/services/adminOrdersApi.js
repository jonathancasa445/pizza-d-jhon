import { adminFetch } from './adminApi.js';
import { csrfRequest } from './adminCsrf.js';

function buildListQuery({ status, page, limit } = {}) {
  const params = new URLSearchParams();

  if (status && status !== 'all') {
    params.set('status', status);
  }

  if (page !== undefined) {
    params.set('page', String(page));
  }

  if (limit !== undefined) {
    params.set('limit', String(limit));
  }

  const query = params.toString();

  return query ? `?${query}` : '';
}

export function listOrders(options) {
  return adminFetch(`/api/admin/orders${buildListQuery(options)}`);
}

export function getOrderStats() {
  return adminFetch('/api/admin/orders/stats');
}

export function getOrder(orderId) {
  return adminFetch(`/api/admin/orders/${encodeURIComponent(orderId)}`);
}

export function updateOrderStatus({ orderId, status, reason }) {
  const body = { status };

  if (typeof reason === 'string') {
    body.reason = reason;
  }

  return csrfRequest(
    `/api/admin/orders/${encodeURIComponent(orderId)}/status`,
    { method: 'PATCH', body }
  );
}
