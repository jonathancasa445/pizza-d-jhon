const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CliError,
  USAGE,
  createAdmin,
  parseArgs,
} = require('../scripts/create-admin');

const PASSWORD = 'ContraseñaSegura123!';

function createHarness(overrides = {}) {
  const {
    existing = null,
    password = PASSWORD,
    argv = ['--username', 'Admin.User-1'],
    environment = {},
  } = overrides;

  const calls = {
    findOne: [],
    create: [],
    updateOne: [],
    connect: 0,
    logs: [],
    prompts: 0,
  };

  const AdminModel = {
    findOne(query) {
      calls.findOne.push(query);
      return {
        async lean() {
          return existing;
        },
      };
    },
    async create(data) {
      calls.create.push(data);
      return data;
    },
    async updateOne(filter, update) {
      calls.updateOne.push({ filter, update });
    },
  };

  return {
    calls,
    options: {
      argv,
      environment,
      AdminModel,
      connect: async () => {
        calls.connect += 1;
      },
      logger: {
        log: (...args) => {
          calls.logs.push(args.join(' '));
        },
      },
      promptSecret: async () => {
        calls.prompts += 1;
        return password;
      },
    },
  };
}

test('parseArgs admite formas largas y rechaza opciones desconocidas', () => {
  assert.deepEqual(parseArgs(['--username', 'admin']), {
    username: 'admin',
    force: false,
    help: false,
  });
  assert.deepEqual(parseArgs(['--username=admin', '--force']), {
    username: 'admin',
    force: true,
    help: false,
  });
  assert.throws(() => parseArgs(['--desconocido']), CliError);
});

test('crea un administrador con credenciales hasheadas y sin secretos en logs', async () => {
  const { calls, options } = createHarness();

  const result = await createAdmin(options);

  assert.equal(result.created, true);
  assert.equal(result.username, 'admin.user-1');
  assert.equal(calls.connect, 1);
  assert.equal(calls.create.length, 1);
  assert.equal(calls.create[0].username, 'admin.user-1');
  assert.match(calls.create[0].passwordHash, /^[a-f0-9]{64}$/);
  assert.match(calls.create[0].passwordSalt, /^[a-f0-9]{32}$/);
  assert.equal(Object.hasOwn(calls.create[0], 'password'), false);

  const output = calls.logs.join(' ');
  assert.equal(output.includes(PASSWORD), false);
  assert.equal(output.includes(calls.create[0].passwordHash), false);
  assert.equal(output.includes(calls.create[0].passwordSalt), false);
});

test('usa ADMIN_PASSWORD sin pedir la contraseña por terminal', async () => {
  const { calls, options } = createHarness({
    environment: { ADMIN_PASSWORD: PASSWORD },
    promptSecret: undefined,
  });

  delete options.promptSecret;

  const result = await createAdmin(options);

  assert.equal(result.created, true);
  assert.equal(calls.prompts, 0);
  assert.equal(calls.create.length, 1);
});

test('rechaza un usuario duplicado sin --force y no escribe', async () => {
  const { calls, options } = createHarness({ existing: { username: 'admin.user-1' } });

  await assert.rejects(() => createAdmin(options), (error) => {
    assert.ok(error instanceof CliError);
    assert.match(error.message, /Ya existe/);
    return true;
  });

  assert.equal(calls.create.length, 0);
  assert.equal(calls.updateOne.length, 0);
});

test('--force actualiza un usuario existente en lugar de crear otro', async () => {
  const { calls, options } = createHarness({
    existing: { username: 'admin.user-1' },
    argv: ['--username', 'admin.user-1', '--force'],
  });

  const result = await createAdmin(options);

  assert.equal(result.created, false);
  assert.equal(calls.create.length, 0);
  assert.equal(calls.updateOne.length, 1);
  assert.equal(
    typeof calls.updateOne[0].update.$set.passwordHash,
    'string'
  );
});

test('rechaza usuario ausente o inválido antes de conectar', async () => {
  const missing = createHarness({ argv: [] });
  await assert.rejects(() => createAdmin(missing.options), CliError);
  assert.equal(missing.calls.connect, 0);

  const invalid = createHarness({ argv: ['--username', 'ab'] });
  await assert.rejects(() => createAdmin(invalid.options), CliError);
  assert.equal(invalid.calls.connect, 0);
});

test('rechaza contraseñas débiles o ausentes antes de conectar', async () => {
  const weak = createHarness({ password: 'corta' });
  await assert.rejects(() => createAdmin(weak.options), (error) => {
    assert.equal(error.code, 'PASSWORD_VALIDATION_ERROR');
    return true;
  });
  assert.equal(weak.calls.connect, 0);

  const absent = createHarness();
  delete absent.options.promptSecret;
  await assert.rejects(() => createAdmin(absent.options), CliError);
  assert.equal(absent.calls.connect, 0);
});

test('--help muestra el uso sin conectar ni crear nada', async () => {
  const { calls, options } = createHarness({ argv: ['--help'] });

  const result = await createAdmin(options);

  assert.equal(result.help, true);
  assert.equal(calls.logs[0], USAGE);
  assert.equal(calls.connect, 0);
  assert.equal(calls.create.length, 0);
});
