import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { adminFetch } from './adminApi.js';
import {
  ensureCsrfToken,
  getCsrfToken,
  resetCsrfToken,
} from './adminCsrf.js';
import { getSession, login, logout } from './adminAuthApi.js';
import {
  getOrder,
  getOrderStats,
  listOrders,
  updateOrderStatus,
} from './adminOrdersApi.js';

const originalFetch = globalThis.fetch;

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

function mockFetch(handler) {
  globalThis.fetch = async (url, options) => handler(String(url), options);
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetCsrfToken();
});

test('adminFetch usa rutas /api, credentials include y mapea errores', async () => {
  const calls = [];

  mockFetch((url, options) => {
    calls.push({ url, options });
    return jsonResponse({ ok: true });
  });

  assert.deepEqual(await adminFetch('/api/menu'), { ok: true });
  assert.equal(calls[0].url, '/api/menu');
  assert.equal(calls[0].options.credentials, 'include');
  assert.equal(calls[0].options.headers.Accept, 'application/json');

  mockFetch(() =>
    jsonResponse(
      { message: 'No autenticado.', code: 'ADMIN_UNAUTHENTICATED' },
      401
    )
  );

  await assert.rejects(
    () => adminFetch('/api/admin/orders'),
    (error) =>
      error.status === 401 &&
      error.code === 'ADMIN_UNAUTHENTICATED' &&
      error.message === 'No autenticado.'
  );
});

test('ensureCsrfToken obtiene el token una sola vez y lo conserva en memoria', async () => {
  let csrfCalls = 0;

  mockFetch((url) => {
    if (url === '/api/admin/auth/csrf') {
      csrfCalls += 1;
      return jsonResponse({ csrfToken: 'a'.repeat(64) });
    }

    throw new Error(`URL inesperada: ${url}`);
  });

  const first = await ensureCsrfToken();
  const second = await ensureCsrfToken();

  assert.equal(first, 'a'.repeat(64));
  assert.equal(second, first);
  assert.equal(getCsrfToken(), first);
  assert.equal(csrfCalls, 1);
});

test('login pide CSRF antes del POST y envía X-CSRF-Token', async () => {
  const calls = [];

  mockFetch((url, options) => {
    calls.push({
      url,
      method: options.method,
      headers: options.headers,
      credentials: options.credentials,
      body: options.body ? JSON.parse(options.body) : null,
    });

    if (url === '/api/admin/auth/csrf') {
      return jsonResponse({ csrfToken: 'b'.repeat(64) });
    }

    if (url === '/api/admin/auth/login') {
      return jsonResponse({ admin: { id: 'admin-1', username: 'jhon' } });
    }

    throw new Error(`URL inesperada: ${url}`);
  });

  const admin = await login({ username: 'jhon', password: 'secreto-de-prueba' });

  assert.deepEqual(admin, { id: 'admin-1', username: 'jhon' });
  assert.equal(calls[0].url, '/api/admin/auth/csrf');
  assert.equal(calls[1].url, '/api/admin/auth/login');
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].headers['X-CSRF-Token'], 'b'.repeat(64));
  assert.equal(calls[1].credentials, 'include');
  assert.deepEqual(calls[1].body, {
    username: 'jhon',
    password: 'secreto-de-prueba',
  });
});

test('csrfRequest reintenta una vez con un token fresco ante CSRF_INVALID', async () => {
  const calls = [];

  mockFetch((url, options) => {
    calls.push({ url, token: options.headers?.['X-CSRF-Token'] });

    if (url === '/api/admin/auth/csrf') {
      const isFirst = calls.filter((call) => call.url === url).length === 1;

      return jsonResponse({
        csrfToken: isFirst ? 'c'.repeat(64) : 'd'.repeat(64),
      });
    }

    if (url.includes('/status')) {
      const patchNumber = calls.filter((call) => call.url.includes('/status')).length;

      if (patchNumber === 1) {
        return jsonResponse(
          { message: 'Token CSRF inválido o ausente.', code: 'CSRF_INVALID' },
          403
        );
      }

      return jsonResponse({ orderId: 'pedido-1', status: 'confirmed' });
    }

    throw new Error(`URL inesperada: ${url}`);
  });

  const result = await updateOrderStatus({
    orderId: '507f1f77bcf86cd799439011',
    status: 'confirmed',
  });

  assert.equal(result.orderId, 'pedido-1');

  const patches = calls.filter((call) => call.url.includes('/status'));

  assert.equal(patches.length, 2);
  assert.equal(patches[0].token, 'c'.repeat(64));
  assert.equal(patches[1].token, 'd'.repeat(64));
});

test('logout envía CSRF y limpia el token en memoria', async () => {
  const calls = [];

  mockFetch((url, options) => {
    calls.push({ url, headers: options.headers, method: options.method });

    if (url === '/api/admin/auth/csrf') {
      return jsonResponse({ csrfToken: 'e'.repeat(64) });
    }

    return jsonResponse({ message: 'Sesión cerrada.' });
  });

  await logout();

  assert.equal(calls[0].url, '/api/admin/auth/csrf');
  assert.equal(calls[1].url, '/api/admin/auth/logout');
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].headers['X-CSRF-Token'], 'e'.repeat(64));
  assert.equal(getCsrfToken(), null);
});

test('los servicios de pedidos usan los parámetros y rutas del backend', async () => {
  const urls = [];

  mockFetch((url) => {
    urls.push(url);

    if (url === '/api/admin/orders/stats') {
      return jsonResponse({ total: 0, byStatus: {}, accepted: 0 });
    }

    if (url.startsWith('/api/admin/orders/')) {
      return jsonResponse({ orderId: 'pedido-2', statusHistory: [] });
    }

    return jsonResponse({
      items: [],
      pagination: { page: 2, limit: 10, total: 0, pages: 0 },
    });
  });

  await listOrders({ status: 'pending', page: 2, limit: 10 });
  await getOrderStats();
  await getOrder('507f1f77bcf86cd799439012');

  assert.ok(urls[0].startsWith('/api/admin/orders?'));
  assert.ok(urls[0].includes('status=pending'));
  assert.ok(urls[0].includes('page=2'));
  assert.ok(urls[0].includes('limit=10'));
  assert.equal(urls[1], '/api/admin/orders/stats');
  assert.equal(
    urls[2],
    '/api/admin/orders/507f1f77bcf86cd799439012'
  );
});

test('getSession propaga respuestas 401 como sesión expirada', async () => {
  mockFetch(() =>
    jsonResponse(
      { message: 'No autenticado.', code: 'ADMIN_UNAUTHENTICATED' },
      401
    )
  );

  await assert.rejects(() => getSession(), (error) => error.status === 401);
});
