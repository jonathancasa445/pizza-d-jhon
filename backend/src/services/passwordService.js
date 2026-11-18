const crypto = require('node:crypto');

const {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_PARAMS,
} = require('../constants/admin');

class PasswordValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PasswordValidationError';
    this.code = 'PASSWORD_VALIDATION_ERROR';
  }
}

function validatePassword(password) {
  if (typeof password !== 'string') {
    throw new PasswordValidationError('La contraseña es obligatoria.');
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new PasswordValidationError(
      `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`
    );
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new PasswordValidationError(
      `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres.`
    );
  }

  return password;
}

function normalizeParams(overrides = {}) {
  return { ...PASSWORD_PARAMS, ...overrides };
}

function derive(password, salt, params) {
  return crypto.scryptSync(password, Buffer.from(salt, 'hex'), params.keyLength, {
    N: params.N,
    r: params.r,
    p: params.p,
    maxmem: params.maxmem,
  });
}

function hashPassword(password, overrides = {}) {
  const validated = validatePassword(password);
  const params = normalizeParams(overrides);
  const salt = crypto.randomBytes(params.saltLength).toString('hex');
  const hash = derive(validated, salt, params).toString('hex');

  return { salt, hash, params };
}

function verifyPassword(password, stored = {}) {
  const source =
    stored && typeof stored === 'object' && !Array.isArray(stored)
      ? stored
      : {};
  const { hash, salt, params } = source;

  if (
    typeof password !== 'string' ||
    typeof hash !== 'string' ||
    typeof salt !== 'string' ||
    !/^[a-f0-9]{64}$/.test(hash) ||
    !/^[a-f0-9]{32}$/.test(salt) ||
    !params ||
    params.algorithm !== 'scrypt'
  ) {
    return false;
  }

  try {
    const effectiveParams = normalizeParams(params);
    const expected = Buffer.from(hash, 'hex');
    const actual = derive(password, salt, effectiveParams);

    return (
      expected.length === actual.length &&
      crypto.timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}

module.exports = {
  PasswordValidationError,
  validatePassword,
  hashPassword,
  verifyPassword,
};
