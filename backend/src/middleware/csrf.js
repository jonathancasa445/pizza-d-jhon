const crypto = require('node:crypto');

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

function createCsrfProtection({
  cookieName = 'pizza_admin_csrf',
  options = { httpOnly: false, secure: false, sameSite: 'lax', path: '/' },
  header = 'x-csrf-token',
} = {}) {
  function generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  function setToken(req, res) {
    const token = generateToken();

    res.cookie(cookieName, token, options);

    return token;
  }

  function clearToken(res) {
    res.clearCookie(cookieName, {
      httpOnly: options.httpOnly,
      secure: options.secure,
      sameSite: options.sameSite,
      path: options.path,
    });
  }

  function isTokenValid(req) {
    const fromCookie = req.cookies?.[cookieName];
    const fromHeader = req.get?.(header) ?? req.headers?.[header];

    if (
      typeof fromCookie !== 'string' ||
      typeof fromHeader !== 'string' ||
      !TOKEN_PATTERN.test(fromCookie) ||
      !TOKEN_PATTERN.test(fromHeader)
    ) {
      return false;
    }

    const cookieBuffer = Buffer.from(fromCookie, 'utf8');
    const headerBuffer = Buffer.from(fromHeader, 'utf8');

    return (
      cookieBuffer.length === headerBuffer.length &&
      crypto.timingSafeEqual(cookieBuffer, headerBuffer)
    );
  }

  function requireToken(req, res, next) {
    if (isTokenValid(req)) {
      return next();
    }

    return res.status(403).json({
      message: 'Token CSRF inválido o ausente.',
      code: 'CSRF_INVALID',
    });
  }

  return {
    cookieName,
    header,
    generateToken,
    setToken,
    clearToken,
    isTokenValid,
    requireToken,
  };
}

module.exports = { createCsrfProtection };
