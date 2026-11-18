const { AdminAuthError } = require('../services/adminAuthService');

function createAdminAuthController({
  security,
  secret,
  expiresIn,
  authenticate,
  csrf,
  logger = console,
} = {}) {
  async function login(req, res) {
    try {
      const { token, admin } = await authenticate({
        username: req.body?.username,
        password: req.body?.password,
        secret,
        expiresIn,
      });

      res.cookie(security.sessionCookie.name, token, security.sessionCookie.options);

      return res.status(200).json({ admin });
    } catch (error) {
      if (error instanceof AdminAuthError) {
        return res.status(error.statusCode).json({
          message: error.message,
          code: error.code,
        });
      }

      // No se registran mensajes de error que puedan contener secretos.
      logger.error?.('Error en el inicio de sesión administrativo.');

      return res.status(500).json({
        message: 'No se pudo iniciar sesión.',
        code: 'ADMIN_LOGIN_ERROR',
      });
    }
  }

  function csrfToken(req, res) {
    const token = csrf.setToken(req, res);

    return res.status(200).json({ csrfToken: token });
  }

  function me(req, res) {
    return res.status(200).json({ admin: req.admin });
  }

  function logout(req, res) {
    csrf.clearToken(res);
    res.clearCookie(security.sessionCookie.name, security.clearCookieOptions);

    return res.status(200).json({ message: 'Sesión cerrada.' });
  }

  return { login, csrfToken, me, logout };
}

module.exports = { createAdminAuthController };
