const ADMIN_USERNAME_MIN_LENGTH = 3;
const ADMIN_USERNAME_MAX_LENGTH = 32;
const ADMIN_USERNAME_PATTERN = /^[a-z0-9._-]+$/;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 200;

// Parámetros scrypt nativos. Se guardan junto al hash para poder verificar
// contraseñas aunque estos valores cambien en el futuro.
const PASSWORD_PARAMS = Object.freeze({
  algorithm: 'scrypt',
  N: 16384,
  r: 8,
  p: 1,
  keyLength: 32,
  saltLength: 16,
  maxmem: 32 * 1024 * 1024,
});

function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function isValidUsername(value) {
  return (
    typeof value === 'string' &&
    value.length >= ADMIN_USERNAME_MIN_LENGTH &&
    value.length <= ADMIN_USERNAME_MAX_LENGTH &&
    ADMIN_USERNAME_PATTERN.test(value)
  );
}

module.exports = {
  ADMIN_USERNAME_MIN_LENGTH,
  ADMIN_USERNAME_MAX_LENGTH,
  ADMIN_USERNAME_PATTERN,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_PARAMS,
  normalizeUsername,
  isValidUsername,
};
