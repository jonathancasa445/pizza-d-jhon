const test = require('node:test');
const assert = require('node:assert/strict');

const {
  AdminAuthError,
  SECRET_FIELDS,
  authenticate,
  decodeToken,
  resolveAuthenticatedAdmin,
  toPublicAdmin,
} = require('../src/services/adminAuthService');
const {
  hashPassword,
  verifyPassword,
} = require('../src/services/passwordService');

const SECRET = 'clave-de-prueba-no-real';
const PASSWORD = 'ContraseñaSegura123!';

function createAdminModel({ admin = null, selected = [] } = {}) {
  const calls = { findOne: [], select: [], updateOne: [], findById: [] };

  return {
    calls,
    findOne(query) {
      calls.findOne.push(query);
      return {
        select(fields) {
          calls.select.push(fields);
          return Promise.resolve(admin);
        },
      };
    },
    async updateOne(filter, update) {
      calls.updateOne.push({ filter, update });
    },
    async findById(id) {
      calls.findById.push(id);
      return admin;
    },
  };
}

function createStoredAdmin(overrides = {}) {
  const credentials = hashPassword(PASSWORD);

  return {
    _id: 'admin-1',
    username: 'admin.principal',
    active: true,
    passwordHash: credentials.hash,
    passwordSalt: credentials.salt,
    passwordParams: credentials.params,
    ...overrides,
  };
}

function signTokenSpy(result = 'token-firmado') {
  const calls = [];
  return {
    calls,
    fn(payload, secret, options) {
      calls.push({ payload, secret, options });
      return result;
    },
  };
}

test('authenticate normaliza el usuario y recupera los campos protegidos', async () => {
  const admin = createStoredAdmin();
  const AdminModel = createAdminModel({ admin });
  const signer = signTokenSpy();

  const result = await authenticate({
    username: '  ADMIN.Principal  ',
    password: PASSWORD,
    secret: SECRET,
    expiresIn: '8h',
    AdminModel,
    signToken: signer.fn,
    verifier: verifyPassword,
  });

  assert.deepEqual(AdminModel.calls.findOne, [
    { username: 'admin.principal' },
  ]);
  assert.deepEqual(AdminModel.calls.select, [SECRET_FIELDS]);
  assert.equal(result.token, 'token-firmado');
  assert.deepEqual(result.admin, {
    id: 'admin-1',
    username: 'admin.principal',
  });
  assert.deepEqual(signer.calls[0].payload, { sub: 'admin-1' });
  assert.equal(signer.calls[0].secret, SECRET);
  assert.deepEqual(signer.calls[0].options, { expiresIn: '8h' });
  assert.equal(AdminModel.calls.updateOne.length, 1);
  assert.ok(AdminModel.calls.updateOne[0].update.$set.lastLoginAt instanceof Date);
  assert.equal(Object.hasOwn(result.admin, 'passwordHash'), false);
});

test('authenticate rechaza contraseña incorrecta con error genérico', async () => {
  const AdminModel = createAdminModel({ admin: createStoredAdmin() });

  await assert.rejects(
    () =>
      authenticate({
        username: 'admin.principal',
        password: PASSWORD + 'x',
        secret: SECRET,
        expiresIn: '8h',
        AdminModel,
        signToken: signTokenSpy().fn,
      }),
    (error) => {
      assert.ok(error instanceof AdminAuthError);
      assert.equal(error.statusCode, 401);
      assert.equal(error.code, 'INVALID_CREDENTIALS');
      assert.equal(error.message, 'Credenciales inválidas.');
      return true;
    }
  );

  assert.equal(AdminModel.calls.updateOne.length, 0);
});

test('authenticate rechaza usuario inexistente e inactivo con el mismo mensaje', async () => {
  const missing = createAdminModel({ admin: null });

  await assert.rejects(
    () =>
      authenticate({
        username: 'no.existe',
        password: PASSWORD,
        secret: SECRET,
        expiresIn: '8h',
        AdminModel: missing,
      }),
    (error) => error instanceof AdminAuthError && error.statusCode === 401
  );

  const inactive = createAdminModel({
    admin: createStoredAdmin({ active: false }),
  });

  await assert.rejects(
    () =>
      authenticate({
        username: 'admin.principal',
        password: PASSWORD,
        secret: SECRET,
        expiresIn: '8h',
        AdminModel: inactive,
      }),
    (error) =>
      error instanceof AdminAuthError &&
      error.message === 'Credenciales inválidas.'
  );

  assert.equal(inactive.calls.updateOne.length, 0);
});

test('authenticate exige credenciales y secreto antes de consultar', async () => {
  const AdminModel = createAdminModel();

  await assert.rejects(
    () =>
      authenticate({
        username: '',
        password: '',
        secret: SECRET,
        AdminModel,
      }),
    (error) => error instanceof AdminAuthError
  );
  assert.equal(AdminModel.calls.findOne.length, 0);

  await assert.rejects(
    () =>
      authenticate({
        username: 'admin.principal',
        password: PASSWORD,
        secret: '',
        AdminModel,
      }),
    /JWT_SECRET/
  );
  assert.equal(AdminModel.calls.findOne.length, 0);
});

test('decodeToken rechaza tokens inválidos, vencidos y payloads sin subject', () => {
  assert.deepEqual(decodeToken('token', SECRET, () => ({ sub: 'admin-1' })), {
    id: 'admin-1',
  });
  assert.equal(
    decodeToken('token', SECRET, () => {
      throw new Error('jwt expired');
    }),
    null
  );
  assert.equal(decodeToken('token', SECRET, () => ({})), null);
  assert.equal(decodeToken('', SECRET, () => ({ sub: 'admin-1' })), null);
  assert.equal(decodeToken('token', '', () => ({ sub: 'admin-1' })), null);
});

test('resolveAuthenticatedAdmin confirma que el admin sigue existiendo y activo', async () => {
  const admin = { _id: 'admin-1', username: 'admin.principal', active: true };
  const AdminModel = createAdminModel({ admin });

  const result = await resolveAuthenticatedAdmin({
    token: 'token',
    secret: SECRET,
    AdminModel,
    tokenVerifier: () => ({ sub: 'admin-1' }),
  });

  assert.deepEqual(result, {
    id: 'admin-1',
    username: 'admin.principal',
  });
  assert.deepEqual(AdminModel.calls.findById, ['admin-1']);

  const withoutSecrets = toPublicAdmin({
    ...admin,
    passwordHash: 'a'.repeat(64),
    passwordSalt: 'b'.repeat(32),
  });
  assert.deepEqual(Object.keys(withoutSecrets).sort(), ['id', 'username']);
});

test('resolveAuthenticatedAdmin devuelve null si falta el admin o está inactivo', async () => {
  const deleted = createAdminModel({ admin: null });
  assert.equal(
    await resolveAuthenticatedAdmin({
      token: 'token',
      secret: SECRET,
      AdminModel: deleted,
      tokenVerifier: () => ({ sub: 'admin-1' }),
    }),
    null
  );

  const disabled = createAdminModel({
    admin: { _id: 'admin-1', username: 'admin.principal', active: false },
  });
  assert.equal(
    await resolveAuthenticatedAdmin({
      token: 'token',
      secret: SECRET,
      AdminModel: disabled,
      tokenVerifier: () => ({ sub: 'admin-1' }),
    }),
    null
  );
});
