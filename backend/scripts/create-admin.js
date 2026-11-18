#!/usr/bin/env node

/**
 * Crea el primer administrador desde la línea de comandos.
 *
 * Uso:
 *   ADMIN_PASSWORD='...' npm run admin:create -- --username admin
 *   npm run admin:create -- --username admin
 *
 * La contraseña se solicita por terminal sin eco si no se usa ADMIN_PASSWORD.
 * Nunca se imprimen contraseñas, salts ni hashes. El script no se ejecuta al
 * importarlo, por lo que sus funciones pueden probarse con mocks.
 */

const mongoose = require('mongoose');

const Admin = require('../src/models/Admin');
const {
  normalizeUsername,
  isValidUsername,
} = require('../src/constants/admin');
const {
  hashPassword,
  validatePassword,
} = require('../src/services/passwordService');

const USAGE = [
  'Uso:',
  '  npm run admin:create -- --username <usuario> [--force]',
  '',
  'La contraseña se lee de ADMIN_PASSWORD o se solicita por terminal sin eco.',
  'No existen credenciales predeterminadas. --force permite actualizar un',
  'usuario ya existente; sin él, los duplicados se rechazan.',
].join('\n');

class CliError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CliError';
    this.code = 'ADMIN_CLI_ERROR';
  }
}

function parseArgs(argv = []) {
  const options = { username: '', force: false, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--username') {
      options.username = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (argument.startsWith('--username=')) {
      options.username = argument.slice('--username='.length);
      continue;
    }

    if (argument === '--force') {
      options.force = true;
      continue;
    }

    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }

    throw new CliError(`Opción no reconocida: ${argument}`);
  }

  return options;
}

function createSecretPrompt() {
  return async function promptSecret() {
    if (!process.stdin.isTTY) {
      throw new CliError(
        'No hay terminal interactiva. Define ADMIN_PASSWORD para crear el administrador.'
      );
    }

    process.stdout.write('Contraseña del administrador: ');

    return new Promise((resolve, reject) => {
      const stdin = process.stdin;
      const previousRawMode = stdin.isRaw;
      let value = '';

      const cleanup = () => {
        stdin.removeListener('data', onData);
        stdin.setRawMode(previousRawMode);
        stdin.pause();
      };

      const onData = (chunk) => {
        for (const char of chunk) {
          if (char === '\r' || char === '\n') {
            cleanup();
            process.stdout.write('\n');
            resolve(value);
            return;
          }

          if (char === '\u0003') {
            cleanup();
            process.stdout.write('\n');
            reject(new CliError('Operación cancelada.'));
            return;
          }

          if (char === '\u007f' || char === '\b') {
            value = value.slice(0, -1);
          } else if (char >= ' ' && char <= '~') {
            value += char;
          }
        }
      };

      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');
      stdin.on('data', onData);
    });
  };
}

async function createAdmin({
  argv = [],
  environment = {},
  promptSecret,
  connect,
  AdminModel = Admin,
  logger = console,
} = {}) {
  const options = parseArgs(argv);

  if (options.help) {
    logger.log(USAGE);
    return { help: true };
  }

  const username = normalizeUsername(options.username || '');

  if (!isValidUsername(username)) {
    throw new CliError(
      'El usuario debe tener entre 3 y 32 caracteres: letras minúsculas, números, punto, guion o guion bajo.'
    );
  }

  const fromEnvironment = environment.ADMIN_PASSWORD;
  let password =
    typeof fromEnvironment === 'string' && fromEnvironment
      ? fromEnvironment
      : '';

  if (!password) {
    if (typeof promptSecret !== 'function') {
      throw new CliError(
        'No se proporcionó ninguna contraseña. Define ADMIN_PASSWORD o usa la entrada segura.'
      );
    }

    password = await promptSecret();
  }

  validatePassword(password);

  if (typeof connect !== 'function') {
    throw new CliError('No se configuró la conexión a la base de datos.');
  }

  await connect();

  const existing = await AdminModel.findOne({ username }).lean();

  if (existing && !options.force) {
    throw new CliError(
      `Ya existe un administrador con el usuario "${username}".`
    );
  }

  const { salt, hash, params } = hashPassword(password);
  const credentials = {
    passwordSalt: salt,
    passwordHash: hash,
    passwordParams: params,
  };

  if (existing) {
    await AdminModel.updateOne(
      { username },
      { $set: { ...credentials, active: true } }
    );
  } else {
    await AdminModel.create({ username, ...credentials });
  }

  logger.log(
    `Administrador "${username}" ${existing ? 'actualizado' : 'creado'} correctamente.`
  );

  return { username, created: !existing };
}

async function main() {
  const env = require('../src/config/env');

  return createAdmin({
    argv: process.argv.slice(2),
    environment: process.env,
    promptSecret: createSecretPrompt(),
    connect: () =>
      mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 }),
    logger: console,
  });
}

if (require.main === module) {
  main()
    .then(() => mongoose.connection.close())
    .catch(async (error) => {
      console.error(`Error: ${error.message}`);
      process.exitCode = 1;
      await mongoose.connection.close();
    });
}

module.exports = {
  CliError,
  USAGE,
  createAdmin,
  createSecretPrompt,
  parseArgs,
};
