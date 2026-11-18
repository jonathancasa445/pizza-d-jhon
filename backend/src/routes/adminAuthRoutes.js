const express = require('express');

function createAdminAuthRoutes({
  controller,
  csrf,
  requireAuth,
  loginLimiter,
} = {}) {
  const router = express.Router();

  // Rutas públicas de autenticación: no se les aplica requireAuth.
  router.get('/csrf', controller.csrfToken);
  router.post('/login', csrf.requireToken, loginLimiter, controller.login);
  router.post('/logout', csrf.requireToken, controller.logout);

  // La sesión se verifica con el middleware; /me nunca es una ruta pública.
  router.get('/me', requireAuth, controller.me);

  return router;
}

module.exports = { createAdminAuthRoutes };
