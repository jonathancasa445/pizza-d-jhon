#!/usr/bin/env node

/**
 * Creación controlada del índice único de administradores.
 *
 * Dry-run por defecto; solo `--apply` crea el índice declarado en el esquema.
 * No elimina ni modifica índices existentes. Requiere autorización exprés.
 *
 *   npm run db:admin-indexes
 *   npm run db:admin-indexes -- --apply
 */

const mongoose = require('mongoose');

const env = require('../src/config/env');
const Admin = require('../src/models/Admin');

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function isMissingNamespace(error) {
  return (
    error?.code === 26 ||
    /ns does not exist|namespace.*not found/i.test(String(error?.message))
  );
}

async function getExistingIndexes() {
  try {
    return await Admin.collection.indexes();
  } catch (error) {
    if (isMissingNamespace(error)) {
      return [];
    }

    throw error;
  }
}

async function inspectAdmins() {
  const collection = Admin.collection;
  const total = await collection.countDocuments({});
  const duplicates = await collection
    .aggregate([
      { $match: { username: { $type: 'string' } } },
      { $group: { _id: '$username', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 5 },
    ])
    .toArray();

  return { total, duplicates: duplicates.length };
}

async function main() {
  if (hasFlag('help')) {
    console.log('Uso:');
    console.log('  npm run db:admin-indexes');
    console.log('  npm run db:admin-indexes -- --apply');
    return;
  }

  const apply = hasFlag('apply');

  console.log('Índices de administradores');
  console.log('--------------------------');
  console.log(`Modo: ${apply ? 'aplicar' : 'dry-run (sin escritura)'}`);
  console.log(`Colección: ${Admin.collection.name}`);
  console.log('\nÍndice requerido por el esquema:');
  console.log('- username:1 [unique]');

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const existingIndexes = await getExistingIndexes();
  const usernameIndex = existingIndexes.find(
    (index) =>
      Object.keys(index.key || {}).length === 1 && index.key.username === 1
  );

  console.log('\nÍndices existentes:');

  if (existingIndexes.length === 0) {
    console.log('- La colección no tiene índices o todavía no existe.');
  } else {
    existingIndexes.forEach((index) => {
      console.log(
        `- ${JSON.stringify(index.key || {})}${index.unique ? ' [unique]' : ''}`
      );
    });
  }

  if (usernameIndex && usernameIndex.unique !== true) {
    throw new Error(
      'Ya existe un índice sobre username que no es único. El script no elimina ni modifica índices existentes.'
    );
  }

  const inspection = await inspectAdmins();
  console.log(
    `\nDocumentos: ${inspection.total}; usuarios duplicados: ${inspection.duplicates}`
  );

  if (inspection.duplicates > 0) {
    throw new Error(
      'Hay usuarios duplicados. No se puede crear el índice único sin resolverlos previamente.'
    );
  }

  if (usernameIndex) {
    console.log(
      '\nEl índice único de username ya existe. No hay índices pendientes.'
    );
    return;
  }

  console.log('\nÍndice pendiente de crear:');
  console.log('- username:1 [unique]');

  if (!apply) {
    console.log(
      '\nDry-run completado. No se creó ni modificó ningún índice. Usa --apply solo con autorización expresa.'
    );
    return;
  }

  console.log('\nCreando índices...');
  await Admin.createIndexes();
  console.log('\nÍndice creado. No se eliminó ningún índice existente.');
}

main()
  .catch((error) => {
    const safeMessage = String(error.message || error).replaceAll(
      env.MONGODB_URI,
      '[MONGODB_URI oculto]'
    );

    console.error(`\nError durante la revisión de índices: ${safeMessage}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
