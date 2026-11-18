require('dotenv').config();

const express = require('express');
const cors = require('cors');

const connectDB = require('./database');
const productRoutes = require('./routes/productRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5177'],
  })
);
app.use(express.json());

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