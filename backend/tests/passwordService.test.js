const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PasswordValidationError,
  hashPassword,
  validatePassword,
  verifyPassword,
} = require('../src/services/passwordService');

const PASSWORD = 'ContraseñaSegura123!';

test('hashPassword genera salt y hash scrypt sin guardar la contraseña', () => {
  const result = hashPassword(PASSWORD);

  assert.match(result.salt, /^[a-f0-9]{32}$/);
  assert.match(result.hash, /^[a-f0-9]{64}$/);
  assert.equal(result.params.algorithm, 'scrypt');
  assert.equal(result.params.keyLength, 32);
  assert.equal(result.params.saltLength, 16);
  assert.equal(Object.hasOwn(result, 'password'), false);
});

test('verifyPassword acepta la contraseña correcta y rechaza la incorrecta', () => {
  const stored = hashPassword(PASSWORD);

  assert.equal(verifyPassword(PASSWORD, stored), true);
  assert.equal(verifyPassword(PASSWORD + 'x', stored), false);
});

test('verifyPassword rechaza hashes manipulados o registros inválidos', () => {
  const stored = hashPassword(PASSWORD);

  assert.equal(
    verifyPassword(PASSWORD, {
      ...stored,
      hash: 'f'.repeat(64),
    }),
    false
  );
  assert.equal(verifyPassword(PASSWORD, {}), false);
  assert.equal(verifyPassword(PASSWORD, null), false);
  assert.equal(
    verifyPassword(PASSWORD, { ...stored, params: { algorithm: 'md5' } }),
    false
  );
});

test('el mismo password produce hashes distintos por el salt aleatorio', () => {
  const first = hashPassword(PASSWORD);
  const second = hashPassword(PASSWORD);

  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(verifyPassword(PASSWORD, first), true);
  assert.equal(verifyPassword(PASSWORD, second), true);
});

test('validatePassword impone límites y tipo', () => {
  assert.throws(() => validatePassword(''), PasswordValidationError);
  assert.throws(() => validatePassword('corta'), PasswordValidationError);
  assert.throws(() => validatePassword('a'.repeat(201)), PasswordValidationError);
  assert.throws(() => validatePassword(123), PasswordValidationError);
  assert.equal(validatePassword(PASSWORD), PASSWORD);
});
