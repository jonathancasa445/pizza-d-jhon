const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const express = require('express');
const cookieParser = require('cookie-parser');

const { createSecurityConfig } = require('../src/config/security');
const { createCsrfProtection } = require('../src/middleware/csrf');
const { createRateLimit } = require('../src/middleware/rateLimit');
const { createRequireAuth } = require('../src/middleware/requireAuth');
const { AdminAuthError } = require('../src/services/adminAuthService');
const { createAdminAuthController } = require('../src/controllers/adminAuthController');
const { createAdminAuthRoutes } = require('../src/routes/adminAuthRoutes');

const PUBLIC_ADMIN = { id: 'admin-1', username: 'admin.principal' };

function cookiePairs(setCookies) {
  const pairs = {};

  for (const header of setCookies) {
    const pair = header.split(';')[0];
    const separator = pair.indexOf('=');

    if (separator > 0) {
      pairs[pair.slice(0, separator)] = pair.slice(separator + 1);
    }
  }

  return pairs;
}

async function createTestContext(t, overrides = {}) {
  const {
    nodeEnv = 'development',
    max = 5,
    authenticateImpl = async () => ({ token: 'jwt-de-prueba', admin: PUBLIC_ADMIN }),
    resolveImpl = async (token) => (token === 'jwt-de-prueba' ? PUBLIC_ADMIN : null),
  } = overrides;

  const logs = [];
  const security = createSecurityConfig({ nodeEnv, jwtExpiresIn: '8h' });
  const csrf = createCsrfProtection({
    cookieName: security.csrfCookie.name,
    options: security.csrfCookie.options,
  });
  const loginLimiter = createRateLimit({
    windowMs: 60000,
    max,
    keyPrefix: 'test-login',
  });
  const requireAuth = createRequireAuth({
    cookieName: security.sessionCookie.name,
    resolveAdmin: resolveImpl,
  });
  const controller = createAdminAuthController({
    security,
    secret: 'secreto-de-prueba',
    expiresIn: '8h',
    authenticate: authenticateImpl,
    csrf,
    logger: { error: (message) => logs.push(message) },
  });

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    '/api/admin/auth',
    createAdminAuthRoutes({ controller, csrf, requireAuth, loginLimiter })
  );

  const server = app.listen(0);
  await once(server, 'listening');
  t.after(() => server.close());

  const { port } = server.address();

  async function request(method, path, options = {}) {
    const { cookies = {}, csrfToken, body, headers = {} } = options;
    const cookieHeader = Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');

    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();

    return {
      status: response.status,
      body: text ? JSON.parse(text) : null,
      rawBody: text,
      headers: response.headers,
      setCookies: response.headers.getSetCookie?.() ?? [],
    };
  }

  async function getCsrf() {
    const response = await request('GET', '/api/admin/auth/csrf');
    assert.equal(response.status, 200);
    assert.match(response.body.csrfToken, /^[a-f0-9]{64}$/);

    return {
      token: response.body.csrfToken,
      cookies: cookiePairs(response.setCookies),
      setCookies: response.setCookies,
    };
  }

  return { security, logs, request, getCsrf };
}

test('GET /csrf emite token y cookie legible; las cookies de sesión protegidas', async (t) => {
  const ctx = await createTestContext(t);
  const csrf = await ctx.getCsrf();
  const csrfCookie = csrf.setCookies.find((header) =>
    header.startsWith('pizza_admin_csrf=')
  );

  assert.ok(csrfCookie);
  assert.match(csrfCookie, /SameSite=Lax/);
  assert.match(csrfCookie, /Path=\//);
  assert.doesNotMatch(csrfCookie, /HttpOnly/);
  assert.doesNotMatch(csrfCookie, /Secure/);
  assert.doesNotMatch(csrfCookie, /Domain=/);

  const dev = ctx.security.sessionCookie.options;
  assert.equal(dev.httpOnly, true);
  assert.equal(dev.secure, false);
  assert.equal(dev.sameSite, 'lax');
  assert.equal(dev.path, '/');
  assert.equal('domain' in dev, false);
});

test('en producción la cookie de sesión es Secure y sigue sin Domain', async (t) => {
  const ctx = await createTestContext(t, { nodeEnv: 'production' });
  const prod = ctx.security.sessionCookie.options;

  assert.equal(prod.httpOnly, true);
  assert.equal(prod.secure, true);
  assert.equal(prod.sameSite, 'lax');
  assert.equal(prod.path, '/');
  assert.equal('domain' in prod, false);
});

test('POST /login exige CSRF', async (t) => {
  const ctx = await createTestContext(t);

  const response = await ctx.request('POST', '/api/admin/auth/login', {
    body: { username: 'admin.principal', password: 'x' },
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.code, 'CSRF_INVALID');
});

test('POST /login correcto devuelve solo datos públicos y cookie HttpOnly', async (t) => {
  const ctx = await createTestContext(t);
  const csrf = await ctx.getCsrf();

  const response = await ctx.request('POST', '/api/admin/auth/login', {
    csrfToken: csrf.token,
    cookies: csrf.cookies,
    body: { username: 'ADMIN.principal', password: 'ContraseñaSegura123!' },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { admin: PUBLIC_ADMIN });

  const session = response.setCookies.find((header) =>
    header.startsWith('pizza_admin_session=')
  );
  assert.ok(session);
  assert.match(session, /HttpOnly/);
  assert.match(session, /SameSite=Lax/);
  assert.match(session, /Path=\//);
  assert.doesNotMatch(session, /Domain=/);
  assert.doesNotMatch(session, /Secure/);

  for (const secret of ['password', 'hash', 'salt', 'token', 'jwt-de-prueba']) {
    assert.equal(response.rawBody.includes(secret), false);
  }
});

test('POST /login con credenciales inválidas no filtra información', async (t) => {
  const ctx = await createTestContext(t, {
    authenticateImpl: async () => {
      throw new AdminAuthError();
    },
  });
  const csrf = await ctx.getCsrf();

  const response = await ctx.request('POST', '/api/admin/auth/login', {
    csrfToken: csrf.token,
    cookies: csrf.cookies,
    body: { username: 'admin.principal', password: 'incorrecta' },
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'INVALID_CREDENTIALS');
  assert.equal(response.body.message, 'Credenciales inválidas.');
  for (const secret of ['password', 'hash', 'salt', 'incorrecta']) {
    assert.equal(response.rawBody.includes(secret), false);
  }
});

test('un error inesperado en login se registra sin secretos', async (t) => {
  const ctx = await createTestContext(t, {
    authenticateImpl: async () => {
      throw new Error('jwt-de-prueba password hash');
    },
  });
  const csrf = await ctx.getCsrf();

  const response = await ctx.request('POST', '/api/admin/auth/login', {
    csrfToken: csrf.token,
    cookies: csrf.cookies,
    body: { username: 'admin.principal', password: 'ContraseñaSegura123!' },
  });

  assert.equal(response.status, 500);
  assert.equal(ctx.logs.length, 1);
  assert.equal(ctx.logs[0].includes('jwt-de-prueba'), false);
  assert.equal(ctx.logs[0].includes('password'), false);
  assert.equal(ctx.logs[0].includes('hash'), false);
});

test('GET /me autenticado y no autenticado', async (t) => {
  const ctx = await createTestContext(t);

  const anonymous = await ctx.request('GET', '/api/admin/auth/me');
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.body.code, 'ADMIN_UNAUTHENTICATED');

  const authenticated = await ctx.request('GET', '/api/admin/auth/me', {
    cookies: { pizza_admin_session: 'jwt-de-prueba' },
  });
  assert.equal(authenticated.status, 200);
  assert.deepEqual(authenticated.body, { admin: PUBLIC_ADMIN });
});

test('GET /me rechaza un token válido si el admin ya no está activo', async (t) => {
  const ctx = await createTestContext(t, { resolveImpl: async () => null });

  const response = await ctx.request('GET', '/api/admin/auth/me', {
    cookies: { pizza_admin_session: 'jwt-de-prueba' },
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'ADMIN_UNAUTHENTICATED');
});

test('POST /logout aplica CSRF y elimina ambas cookies', async (t) => {
  const ctx = await createTestContext(t);
  const csrf = await ctx.getCsrf();

  const withoutCsrf = await ctx.request('POST', '/api/admin/auth/logout');
  assert.equal(withoutCsrf.status, 403);

  const response = await ctx.request('POST', '/api/admin/auth/logout', {
    csrfToken: csrf.token,
    cookies: {
      ...csrf.cookies,
      pizza_admin_session: 'jwt-de-prueba',
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'Sesión cerrada.');
  assert.ok(
    response.setCookies.some((header) =>
      header.startsWith('pizza_admin_session=')
    )
  );
  assert.ok(
    response.setCookies.some((header) =>
      header.startsWith('pizza_admin_csrf=')
    )
  );
  assert.ok(
    response.setCookies.some((header) => /Max-Age=0|Expires=/.test(header))
  );
});

test('el rate limiting bloquea después del máximo de intentos', async (t) => {
  const ctx = await createTestContext(t, { max: 2 });
  const csrf = await ctx.getCsrf();

  const options = {
    csrfToken: csrf.token,
    cookies: csrf.cookies,
    body: { username: 'admin.principal', password: 'x' },
  };

  const first = await ctx.request('POST', '/api/admin/auth/login', options);
  const second = await ctx.request('POST', '/api/admin/auth/login', options);
  const third = await ctx.request('POST', '/api/admin/auth/login', options);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(third.status, 429);
  assert.equal(third.body.code, 'RATE_LIMITED');
  assert.equal(third.headers.get('X-RateLimit-Limit'), '2');
});
