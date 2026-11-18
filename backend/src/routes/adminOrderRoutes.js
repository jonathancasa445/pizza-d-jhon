const express = require('express');

function createAdminOrderRoutes({ controller, requireAuth, csrf } = {}) {
  const router = express.Router();

  // Solo la API administrativa de pedidos; no afecta a rutas públicas ni
  // a las rutas de autenticación montadas antes que este router.
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // Ninguna ruta de este router es pública: requireAuth se aplica a todas.
  router.use(requireAuth);

  // /stats debe ir antes de /:id para que no se interprete como identificador.
  router.get('/orders', controller.list);
  router.get('/orders/stats', controller.stats);
  router.get('/orders/:id', controller.detail);
  router.patch('/orders/:id/status', csrf.requireToken, controller.changeStatus);

  return router;
}

module.exports = { createAdminOrderRoutes };
