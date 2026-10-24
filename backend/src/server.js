require('dotenv').config();

const express = require('express');
const connectDB = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('¡Bienvenido al servidor de Pizza D\' Jhon!');
});

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  });
}

startServer();