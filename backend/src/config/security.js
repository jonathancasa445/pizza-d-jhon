const DEFAULT_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

const DURATION_FACTORS_MS = Object.freeze({
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
});

function parseDurationMs(value, fallbackMs = DEFAULT_SESSION_MAX_AGE_MS) {
  if (typeof value !== 'string') {
    return fallbackMs;
  }

  const match = value.trim().match(/^(\d+)\s*(ms|s|m|h|d)$/i);

  if (!match) {
    return fallbackMs;
  }

  const amount = Number(match[1]);
  const factor = DURATION_FACTORS_MS[match[2].toLowerCase()];

  return Number.isSafeInteger(amount * factor) ? amount * factor : fallbackMs;
}

function createCookieOptions({ isProduction, maxAge, httpOnly = true }) {
  // Sin Domain: la cookie queda ligada al host de Netlify cuando se usa el
  // proxy de API. Secure solo en producción (HTTPS); SameSite=Lax en ambos.
  return {
    httpOnly,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

function createSecurityConfig({
  nodeEnv = 'development',
  jwtExpiresIn = '8h',
} = {}) {
  const isProduction = nodeEnv === 'production';
  const maxAge = parseDurationMs(jwtExpiresIn);

  return {
    isProduction,
    trustProxy: isProduction ? 1 : false,
    sessionCookie: {
      name: 'pizza_admin_session',
      options: createCookieOptions({ isProduction, maxAge }),
    },
    csrfCookie: {
      name: 'pizza_admin_csrf',
      options: createCookieOptions({
        isProduction,
        maxAge,
        httpOnly: false,
      }),
    },
    clearCookieOptions: createCookieOptions({
      isProduction,
      maxAge: 0,
    }),
    securityHeaders: Object.freeze({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    }),
  };
}

module.exports = {
  createSecurityConfig,
  createCookieOptions,
  parseDurationMs,
};
