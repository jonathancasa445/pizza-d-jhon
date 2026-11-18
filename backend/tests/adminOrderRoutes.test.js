const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const express = require('express');
const cookieParser = require('cookie-parser');

const { createSecurityConfig } = require('../src/config/security');
const { createCsrfProtection } = require('../src/middleware/csrf');
const { createRequireAuth } = require('../src/middleware/requireAuth');
const { OrderManagementError } = require('../src/services/orderManagementErrors');
const { createAdminOrderController } = require('../src/controllers/adminOrderController');
const { createAdminOrderRoutes } = require('../src/routes/adminOrderRoutes');

const ORDER_ID = '6afd04950791c67adc5ba1fc';
const SESSION_COOKIE = 'pizza_admin_session';
const CSRF_COOKIE = 'pizza_admin_csrf';
const ADMIN = { id: 'admin-1', username: 'admin.principal' };

function createTestContext(t, overrides = {}) {
  const {
    listImpl = async () => ({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    }),
    statsImpl = async () => ({ total: 0, byStatus: {}, accepted: 0 }),
    detailImpl = async () => ({ orderId: ORDER_ID, statusHistory: [] }),
    changeImpl = async () => ({ orderId: ORDER_ID, status: 'confirmed' }),
  } = overrides;

  const calls = { list: [], stats: 0, detail: [], change: [] };
  const logs = [];
  const security = createSecurityConfig({ nodeEnv: 'development' });
  const csrf = createCsrfProtection({
    cookieName: security.csrfCookie.name,
    options: security.csrfCookie.options,
  });
  const requireAuth = createRequireAuth({
    cookieName: security.sessionCookie.name,
    resolveAdmin: async (token) => (token === 'admin-token' ? ADMIN : null),
  });
  const controller = createAdminOrderController({
    listOrders: async (args) => {
      calls.list.push(args);
      return listImpl(args);
    },
    getOrderStats: async () => {
      calls.stats += 1;
      return statsImpl();
    },
    getOrderDetail: async (args) => {
      calls.detail.push(args);
      return detailImpl(args);
    },
    changeOrderStatus: async (args) => {
      calls.change.push(args);
      return changeImpl(args);
    },
    logger: { error: (message) => logs.push(message) },
  });

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Ruta pública de control: demuestra que no hay requireAuth global.
  app.get('/api/menu', (req, res) => res.json({ public: true }));

  app.use(
    '/api/admin',
    createAdminOrderRoutes({ controller, requireAuth, csrf })
  );

  return startServer(t, app, { calls, logs, csrf });
}

async function startServer(t, app, extras) {
  const server = app.listen(0);
  await once(server, 'listening');
  t.after(() => server.close());

  const { port } = server.address();

  async function request(method, path, options = {}) {
    const { cookies = {}, csrfToken, body, query = {} } = options;
    const url = new URL(`http://127.0.0.1:${port}${path}`);

    for (const [name, value] of Object.entries(query)) {
      url.searchParams.set(name, String(value));
    }

    const cookieHeader = Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');

    const response = await fetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();

    return {
      status: response.status,
      body: text ? JSON.parse(text) : null,
      rawBody: text,
      headers: response.headers,
    };
  }

  return {
    ...extras,
    request,
    sessionCookies: { [SESSION_COOKIE]: 'admin-token' },
    csrfCookies: (token) => ({ [CSRF_COOKIE]: token }),
    newCsrfToken: () => extras.csrf.generateToken(),
  };
}

test('todas las rutas administrativas exigen sesión', async (t) => {
  const ctx = await createTestContext(t);
  const endpoints = [
    ['GET', '/api/admin/orders'],
    ['GET', '/api/admin/orders/stats'],
    ['GET', `/api/admin/orders/${ORDER_ID}`],
    ['PATCH', `/api/admin/orders/${ORDER_ID}/status`],
  ];

  for (const [method, path] of endpoints) {
    const response = await ctx.request(method, path, {
      body: method === 'PATCH' ? { status: 'confirmed' } : undefined,
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.code, 'ADMIN_UNAUTHENTICATED');
  }

  assert.equal(ctx.calls.stats, 0);
  assert.equal(ctx.calls.change.length, 0);
});

test('la ruta pública del catálogo sigue accesible sin sesión', async (t) => {
  const ctx = await createTestContext(t);
  const response = await ctx.request('GET', '/api/menu');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { public: true });
});

test('listado con sesión válida responde paginación y aplica filtros', async (t) => {
  const ctx = await createTestContext(t, {
    listImpl: async () => ({
      items: [{ orderId: ORDER_ID }],
      pagination: { page: 2, limit: 5, total: 12, pages: 3 },
    }),
  });

  const response = await ctx.request('GET', '/api/admin/orders', {
    cookies: ctx.sessionCookies,
    query: { status: 'confirmed', page: 2, limit: 5 },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.pagination, {
    page: 2,
    limit: 5,
    total: 12,
    pages: 3,
  });
  assert.deepEqual(ctx.calls.list[0], {
    status: 'confirmed',
    page: '2',
    limit: '5',
  });
});

test('estadísticas conservan la clasificación unclassified', async (t) => {
  const stats = {
    total: 4,
    byStatus: {
      pending: 1,
      confirmed: 1,
      preparing: 0,
      on_the_way: 0,
      delivered: 0,
      cancelled: 1,
      unclassified: 1,
    },
    accepted: 1,
  };
  const ctx = await createTestContext(t, { statsImpl: async () => stats });

  const response = await ctx.request('GET', '/api/admin/orders/stats', {
    cookies: ctx.sessionCookies,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, stats);
  assert.equal(ctx.calls.stats, 1);
  // /stats se resuelve antes que /:id: no se consulta el detalle.
  assert.equal(ctx.calls.detail.length, 0);
});

test('detalle consulta el identificador y devuelve el historial', async (t) => {
  const ctx = await createTestContext(t, {
    detailImpl: async () => ({
      orderId: ORDER_ID,
      status: 'confirmed',
      statusHistory: [{ newStatus: 'pending' }],
    }),
  });

  const response = await ctx.request('GET', `/api/admin/orders/${ORDER_ID}`, {
    cookies: ctx.sessionCookies,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.statusHistory.length, 1);
  assert.deepEqual(ctx.calls.detail[0], { orderId: ORDER_ID });
});

test('errores de servicios de la Etapa 3 se propagan con su código', async (t) => {
  const cases = [
    {
      error: new OrderManagementError('Inválido', 'INVALID_ORDER_ID', 400),
      expected: 400,
      code: 'INVALID_ORDER_ID',
    },
    {
      error: new OrderManagementError('No encontrado', 'ORDER_NOT_FOUND', 404),
      expected: 404,
      code: 'ORDER_NOT_FOUND',
    },
    {
      error: new OrderManagementError('Conflicto', 'ORDER_STATUS_CONFLICT', 409),
      expected: 409,
      code: 'ORDER_STATUS_CONFLICT',
    },
  ];

  for (const { error, expected, code } of cases) {
    const ctx = await createTestContext(t, {
      detailImpl: async () => {
        throw error;
      },
      changeImpl: async () => {
        throw error;
      },
    });

    const detail = await ctx.request('GET', `/api/admin/orders/${ORDER_ID}`, {
      cookies: ctx.sessionCookies,
    });
    assert.equal(detail.status, expected);
    assert.equal(detail.body.code, code);

    const csrfToken = ctx.newCsrfToken();
    const change = await ctx.request(
      'PATCH',
      `/api/admin/orders/${ORDER_ID}/status`,
      {
        cookies: {
          ...ctx.sessionCookies,
          ...ctx.csrfCookies(csrfToken),
        },
        csrfToken,
        body: { status: 'confirmed' },
      }
    );
    assert.equal(change.status, expected);
    assert.equal(change.body.code, code);
  }
});

test('PATCH exige CSRF válido', async (t) => {
  const ctx = await createTestContext(t);

  const withoutCsrf = await ctx.request(
    'PATCH',
    `/api/admin/orders/${ORDER_ID}/status`,
    { cookies: ctx.sessionCookies, body: { status: 'confirmed' } }
  );
  assert.equal(withoutCsrf.status, 403);
  assert.equal(withoutCsrf.body.code, 'CSRF_INVALID');
  assert.equal(ctx.calls.change.length, 0);

  const csrfToken = ctx.newCsrfToken();
  const withCsrf = await ctx.request(
    'PATCH',
    `/api/admin/orders/${ORDER_ID}/status`,
    {
      cookies: { ...ctx.sessionCookies, ...ctx.csrfCookies(csrfToken) },
      csrfToken,
      body: { status: 'confirmed' },
    }
  );
  assert.equal(withCsrf.status, 200);
  assert.equal(ctx.calls.change.length, 1);
});

test('adminId se toma de req.admin y nunca del body', async (t) => {
  const ctx = await createTestContext(t);
  const csrfToken = ctx.newCsrfToken();
  const cookies = {
    ...ctx.sessionCookies,
    ...ctx.csrfCookies(csrfToken),
  };

  const spoofed = await ctx.request(
    'PATCH',
    `/api/admin/orders/${ORDER_ID}/status`,
    {
      cookies,
      csrfToken,
      body: { status: 'confirmed', adminId: 'atacante' },
    }
  );
  assert.equal(spoofed.status, 400);
  assert.equal(spoofed.body.code, 'INVALID_BODY');
  assert.equal(ctx.calls.change.length, 0);

  const valid = await ctx.request(
    'PATCH',
    `/api/admin/orders/${ORDER_ID}/status`,
    {
      cookies,
      csrfToken,
      body: { status: 'confirmed', reason: '' },
    }
  );
  assert.equal(valid.status, 200);
  assert.equal(ctx.calls.change[0].adminId, ADMIN.id);
  assert.equal('adminId' in ctx.calls.change[0], true);
});

test('el cliente no puede modificar productos, cantidades, precios ni totales', async (t) => {
  const ctx = await createTestContext(t);
  const csrfToken = ctx.newCsrfToken();

  const response = await ctx.request(
    'PATCH',
    `/api/admin/orders/${ORDER_ID}/status`,
    {
      cookies: { ...ctx.sessionCookies, ...ctx.csrfCookies(csrfToken) },
      csrfToken,
      body: {
        status: 'confirmed',
        items: [{ productKey: 'otro-producto', quantity: 99 }],
        totalCents: 1,
        subtotalCents: 1,
        idempotencyKey: 'otra-clave',
      },
    }
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'INVALID_BODY');
  assert.equal(ctx.calls.change.length, 0);
});

test('motivo obligatorio y transición inválida se delegan al servicio', async (t) => {
  const errors = [
    new OrderManagementError('Motivo requerido', 'REASON_REQUIRED', 400),
    new OrderManagementError('Estado inválido', 'INVALID_STATUS', 400),
  ];

  for (const error of errors) {
    const ctx = await createTestContext(t, {
      changeImpl: async () => {
        throw error;
      },
    });
    const csrfToken = ctx.newCsrfToken();

    const response = await ctx.request(
      'PATCH',
      `/api/admin/orders/${ORDER_ID}/status`,
      {
        cookies: { ...ctx.sessionCookies, ...ctx.csrfCookies(csrfToken) },
        csrfToken,
        body: { status: 'confirmed' },
      }
    );

    assert.equal(response.status, 400);
    assert.equal(response.body.code, error.code);
  }
});

test('errores inesperados responden 500 sin filtrar detalles', async (t) => {
  const ctx = await createTestContext(t, {
    statsImpl: async () => {
      throw new Error('secreto-interno stack trace');
    },
  });

  const response = await ctx.request('GET', '/api/admin/orders/stats', {
    cookies: ctx.sessionCookies,
  });

  assert.equal(response.status, 500);
  assert.equal(response.body.code, 'ADMIN_ORDERS_ERROR');
  assert.equal(response.rawBody.includes('secreto-interno'), false);
  assert.equal(response.rawBody.includes('stack'), false);
  assert.equal(ctx.logs.length, 1);
  assert.equal(ctx.logs[0].includes('secreto-interno'), false);
});

test('un ObjectId malformado responde 400 antes de consultar los servicios', async (t) => {
  const ctx = await createTestContext(t);
  const malformedId = 'no-es-object-id';

  const detail = await ctx.request(
    'GET',
    `/api/admin/orders/${malformedId}`,
    { cookies: ctx.sessionCookies }
  );
  assert.equal(detail.status, 400);
  assert.equal(detail.body.code, 'INVALID_ORDER_ID');

  const csrfToken = ctx.newCsrfToken();
  const change = await ctx.request(
    'PATCH',
    `/api/admin/orders/${malformedId}/status`,
    {
      cookies: { ...ctx.sessionCookies, ...ctx.csrfCookies(csrfToken) },
      csrfToken,
      body: { status: 'confirmed' },
    }
  );
  assert.equal(change.status, 400);
  assert.equal(change.body.code, 'INVALID_ORDER_ID');

  assert.equal(ctx.calls.detail.length, 0);
  assert.equal(ctx.calls.change.length, 0);
});

test('la API administrativa envía Cache-Control no-store', async (t) => {
  const ctx = await createTestContext(t);

  const unauthenticated = await ctx.request('GET', '/api/admin/orders');
  assert.equal(unauthenticated.headers.get('Cache-Control'), 'no-store');

  const authenticated = await ctx.request('GET', '/api/admin/orders', {
    cookies: ctx.sessionCookies,
  });
  assert.equal(authenticated.headers.get('Cache-Control'), 'no-store');

  const publicRoute = await ctx.request('GET', '/api/menu');
  assert.equal(publicRoute.headers.get('Cache-Control'), null);
});
