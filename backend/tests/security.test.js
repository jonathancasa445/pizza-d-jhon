const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseDurationMs,
  createSecurityConfig,
} = require('../src/config/security');
const { createSecurityHeaders } = require('../src/middleware/securityHeaders');
const { createCsrfProtection } = require('../src/middleware/csrf');
const { createRateLimit } = require('../src/middleware/rateLimit');

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    cookies: [],
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    set(values) {
      Object.assign(this.headers, values);
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    cookie(name, value, options) {
      this.cookies.push({ name, value, options });
      return this;
    },
    clearCookie(name, options) {
      this.cleared = { name, options };
      return this;
    },
  };
}

test('parseDurationMs interpreta JWT_EXPIRES_IN y usa un valor seguro por defecto', () => {
  assert.equal(parseDurationMs('8h'), 8 * 60 * 60 * 1000);
  assert.equal(parseDurationMs('15m'), 15 * 60 * 1000);
  assert.equal(parseDurationMs('30s'), 30 * 1000);
  assert.equal(parseDurationMs('500ms'), 500);
  assert.equal(parseDurationMs('inválido'), 8 * 60 * 60 * 1000);
  assert.equal(parseDurationMs(undefined, 1000), 1000);
});

test('las cookies de desarrollo no son Secure y las de producción sí', () => {
  const dev = createSecurityConfig({ nodeEnv: 'development' });
  const prod = createSecurityConfig({ nodeEnv: 'production', jwtExpiresIn: '2h' });

  assert.equal(dev.sessionCookie.options.httpOnly, true);
  assert.equal(dev.sessionCookie.options.secure, false);
  assert.equal(dev.sessionCookie.options.sameSite, 'lax');
  assert.equal(dev.sessionCookie.options.path, '/');
  assert.equal(dev.sessionCookie.options.maxAge, 8 * 60 * 60 * 1000);
  assert.equal('domain' in dev.sessionCookie.options, false);

  assert.equal(dev.csrfCookie.options.httpOnly, false);
  assert.equal(prod.sessionCookie.options.secure, true);
  assert.equal(prod.csrfCookie.options.sameSite, 'lax');
  assert.equal('domain' in prod.sessionCookie.options, false);
  assert.equal(prod.sessionCookie.options.maxAge, 2 * 60 * 60 * 1000);
  assert.equal(prod.trustProxy, 1);
  assert.equal(dev.trustProxy, false);
});

test('las cabeceras de seguridad se aplican desde la configuración', () => {
  const middleware = createSecurityHeaders({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });
  const res = createResponse();
  let nextCalled = false;

  middleware({}, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(res.headers['X-Frame-Options'], 'DENY');
});

test('CSRF de doble envío: token válido, ausente y distinto', () => {
  const csrf = createCsrfProtection({
    cookieName: 'csrf_test',
    header: 'x-csrf-token',
  });
  const token = csrf.generateToken();

  assert.match(token, /^[a-f0-9]{64}$/);

  const validRequest = {
    cookies: { csrf_test: token },
    headers: { 'x-csrf-token': token },
  };
  let nextCalled = false;
  let res = createResponse();

  csrf.requireToken(validRequest, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);

  res = createResponse();
  csrf.requireToken({ cookies: {}, headers: {} }, res, () => {});
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'CSRF_INVALID');

  res = createResponse();
  csrf.requireToken(
    {
      cookies: { csrf_test: token },
      headers: { 'x-csrf-token': 'a'.repeat(64) },
    },
    res,
    () => {}
  );
  assert.equal(res.statusCode, 403);
});

test('setToken escribe la cookie CSRF con las opciones indicadas', () => {
  const options = { httpOnly: false, secure: false, sameSite: 'lax', path: '/' };
  const csrf = createCsrfProtection({ cookieName: 'csrf_test', options });
  const res = createResponse();

  const token = csrf.setToken({}, res);

  assert.equal(res.cookies.length, 1);
  assert.equal(res.cookies[0].name, 'csrf_test');
  assert.equal(res.cookies[0].value, token);
  assert.deepEqual(res.cookies[0].options, options);
});

test('el limitador de tasa bloquea después del máximo de solicitudes', () => {
  const limit = createRateLimit({ windowMs: 60000, max: 2 });
  const req = { ip: '127.0.0.1', socket: {}, body: {} };

  const first = createResponse();
  const second = createResponse();
  const third = createResponse();
  let calls = 0;

  limit(req, first, () => {
    calls += 1;
  });
  limit(req, second, () => {
    calls += 1;
  });
  limit(req, third, () => {
    calls += 1;
  });

  assert.equal(calls, 2);
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal(third.statusCode, 429);
  assert.equal(third.body.code, 'RATE_LIMITED');
  assert.equal(third.headers['X-RateLimit-Limit'], '2');
});
