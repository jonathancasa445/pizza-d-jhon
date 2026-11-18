const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const { createSecurityConfig } = require('./config/security');
const { createSecurityHeaders } = require('./middleware/securityHeaders');
const connectDB = require('./database');
const productRoutes = require('./routes/productRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');

const security = createSecurityConfig({
  nodeEnv: env.NODE_ENV,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
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

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  });
}

startServer();