const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const { createSecurityConfig } = require('./config/security');
const { createSecurityHeaders } = require('./middleware/securityHeaders');
const { createCsrfProtection } = require('./middleware/csrf');
const { createRateLimit } = require('./middleware/rateLimit');
const { createRequireAuth } = require('./middleware/requireAuth');
const {
  authenticate,
  resolveAuthenticatedAdmin,
} = require('./services/adminAuthService');
const {
  listOrders,
  getOrderDetail,
  getOrderStats,
} = require('./services/adminOrderService');
const { changeOrderStatus } = require('./services/orderStatusService');
const { createAdminAuthController } = require('./controllers/adminAuthController');
const { createAdminAuthRoutes } = require('./routes/adminAuthRoutes');
const { createAdminOrderController } = require('./controllers/adminOrderController');
const { createAdminOrderRoutes } = require('./routes/adminOrderRoutes');
const connectDB = require('./database');
const productRoutes = require('./routes/productRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');

const security = createSecurityConfig({
  nodeEnv: env.NODE_ENV,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
});

const csrf = createCsrfProtection({
  cookieName: security.csrfCookie.name,
  options: security.csrfCookie.options,
});

const loginLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyPrefix: 'admin-login',
});

const requireAuth = createRequireAuth({
  cookieName: security.sessionCookie.name,
  resolveAdmin: (token) =>
    resolveAuthenticatedAdmin({ token, secret: env.JWT_SECRET }),
});

const adminAuthController = createAdminAuthController({
  security,
  secret: env.JWT_SECRET,
  expiresIn: env.JWT_EXPIRES_IN,
  authenticate,
  csrf,
});

const adminOrderController = createAdminOrderController({
  listOrders,
  getOrderDetail,
  getOrderStats,
  changeOrderStatus,
});

const app = express();
const PORT = env.PORT;

app.set('trust proxy', security.trustProxy);

app.use(cors({ origin: env.CLIENT_ORIGINS, credentials: true }));
app.use(createSecurityHeaders(security.securityHeaders));
app.use(express.json());
app.use(cookieParser());

// Ruta principal.
app.get('/', (req, res) => {
  res.send('¡Bienvenido al servidor de Pizza D\' Jhon!');
});

// Rutas de productos (endpoint legado compatible con el frontend actual).
app.use('/api/products', productRoutes);

// Catálogo público nuevo.
app.use('/api/menu', menuRoutes);

// Registro de pedidos.
app.use('/api/orders', orderRoutes);

// Autenticación administrativa (rutas públicas + /me protegida).
app.use(
  '/api/admin/auth',
  createAdminAuthRoutes({
    controller: adminAuthController,
    csrf,
    requireAuth,
    loginLimiter,
  })
);

// API administrativa de pedidos (protegida por requireAuth y CSRF en PATCH).
app.use(
  '/api/admin',
  createAdminOrderRoutes({
    controller: adminOrderController,
    requireAuth,
    csrf,
  })
);

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  });
}

startServer();