const express = require('express');

const app = express();
const PORT = 3000;

// Permite recibir y procesar datos JSON.
app.use(express.json());

// Ruta inicial del servidor.
app.get('/', (req, res) => {
  res.send('¡Bienvenido al servidor de Pizza D\' Jhon!');
});

// Inicia el servidor.
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});