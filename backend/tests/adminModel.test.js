const test = require('node:test');
const assert = require('node:assert/strict');

const Admin = require('../src/models/Admin');

function makeAdmin(overrides = {}) {
  return new Admin({
    username: 'admin.user-1',
    passwordHash: 'a'.repeat(64),
    passwordSalt: 'b'.repeat(32),
    ...overrides,
  });
}

test('el modelo Admin normaliza el username y aplica valores por defecto', async () => {
  const admin = makeAdmin({ username: '  ADMIN.User-1  ' });

  assert.equal(admin.username, 'admin.user-1');
  await admin.validate();
  assert.equal(admin.active, true);
  assert.equal(admin.passwordParams.algorithm, 'scrypt');
  assert.equal(admin.lastLoginAt, null);
});

test('el modelo Admin valida el username', async () => {
  await assert.rejects(() => makeAdmin({ username: 'ab' }).validate());
  await assert.rejects(() =>
    makeAdmin({ username: 'usuario con espacio' }).validate()
  );
  await assert.rejects(() => makeAdmin({ username: 'x'.repeat(33) }).validate());
  await assert.rejects(() => makeAdmin({ username: '' }).validate());
});

test('el modelo Admin exige salt y hash con el formato esperado', async () => {
  await assert.rejects(() => makeAdmin({ passwordHash: undefined }).validate());
  await assert.rejects(() => makeAdmin({ passwordSalt: 'corto' }).validate());
  await assert.rejects(() => makeAdmin({ passwordHash: 'xyz' }).validate());
});

test('el hash y el salt no se devuelven en consultas normales', () => {
  assert.equal(Admin.schema.path('passwordHash').options.select, false);
  assert.equal(Admin.schema.path('passwordSalt').options.select, false);
});

test('el modelo declara el índice único de username', () => {
  const indexes = Admin.schema.indexes();
  const usernameIndex = indexes.find(
    ([fields]) => Object.keys(fields).length === 1 && fields.username === 1
  );

  assert.ok(usernameIndex);
  assert.equal(usernameIndex[1].unique, true);
});
