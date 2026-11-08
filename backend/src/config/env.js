const path = require('path');
const dotenv = require('dotenv');

// Carga siempre el .env del backend, independientemente del directorio
// desde el que se ejecute el script.
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
  quiet: true,
});

function readEnv(name, { required = false, fallback = '' } = {}) {
  const rawValue = process.env[name];
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';

  if (!value && required) {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }

  return value || fallback;
}

function parsePort(value) {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('La variable PORT debe ser un número entre 1 y 65535.');
  }

  return port;
}

function parseOrigins(value) {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const MONGODB_URI = readEnv('MONGODB_URI', { required: true });
const PORT = parsePort(readEnv('PORT', { fallback: '3000' }));
const NODE_ENV = readEnv('NODE_ENV', { fallback: 'development' });
const CLIENT_ORIGINS = parseOrigins(
  readEnv('CLIENT_ORIGINS', { fallback: 'http://localhost:5173' })
);

module.exports = {
  MONGODB_URI,
  PORT,
  NODE_ENV,
  CLIENT_ORIGINS,
};
