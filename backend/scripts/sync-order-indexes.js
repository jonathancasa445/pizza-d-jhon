#!/usr/bin/env node

/**
 * Creación controlada del índice único de pedidos.
 *
 * - Dry-run por defecto: conecta en modo lectura, revisa conflictos y muestra
 *   el índice que se crearía, pero no escribe nada.
 * - `--apply` crea los índices definidos en el esquema con `createIndexes()`.
 * - No usa `syncIndexes()` y no elimina ni modifica índices existentes.
 * - Antes de aplicar, verifica claves de idempotencia ausentes o duplicadas.
 *
 * Uso:
 *   npm run db:order-indexes
 *   npm run db:order-indexes -- --apply
 */

const mongoose = require('mongoose');
const env = require('../src/config/env');
const Order = require('../src/models/Order');

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function formatIndexFields(fields) {
  return Object.entries(fields)
    .map(([field, direction]) => `${field}:${direction}`)
    .join(', ');
}

function isMissingNamespace(error) {
  return (
    error?.code === 26 ||
    /ns does not exist|namespace.*not found/i.test(String(error?.message))
  );
}

async function getExistingIndexes() {
  try {
    return await Order.collection.indexes();
  } catch (error) {
    if (isMissingNamespace(error)) {
      return [];
    }

    throw error;
  }
}

async function inspectOrders() {
  const collection = Order.collection;
  const total = await collection.countDocuments({});
  const missingIdempotencyKeys = await collection.countDocuments({
    $or: [
      { idempotencyKey: { $exists: false } },
      { idempotencyKey: null },
      { idempotencyKey: { $not: { $type: 'string' } } },
    ],
  });
  const duplicates = await collection
    .aggregate([
      { $match: { idempotencyKey: { $type: 'string' } } },
      {
        $group: {
          _id: '$idempotencyKey',
          count: { $sum: 1 },
          ids: { $push: '$_id' },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 5 },
    ])
    .toArray();

  if (missingIdempotencyKeys > 0) {
    throw new Error(
      `Pedidos: hay ${missingIdempotencyKeys} documento(s) sin idempotencyKey válida. No se puede crear el índice único.`
    );
  }

  if (duplicates.length > 0) {
    const detail = duplicates
      .map(
        (item) =>
          `${item._id} (${item.ids
            .slice(0, 5)
            .map((id) => String(id))
            .join(', ')})`
      )
      .join('; ');

    throw new Error(
      `Pedidos: hay ${duplicates.length} clave(s) de idempotencia duplicadas. No se puede crear el índice único. Detalle: ${detail}`
    );
  }

  return {
    total,
    missingIdempotencyKeys,
    duplicates: duplicates.length,
  };
}

function findIdempotencyIndex(indexes) {
  return indexes.find((index) => {
    const keys = Object.keys(index.key || {});

    return keys.length === 1 && index.key.idempotencyKey === 1;
  });
}

async function main() {
  if (hasFlag('help')) {
    console.log('Uso:');
    console.log('  npm run db:order-indexes');
    console.log('  npm run db:order-indexes -- --apply');
    console.log('');
    console.log(
      'Sin --apply solo revisa y muestra el índice. Con --apply lo crea sin eliminar índices existentes.'
    );
    return;
  }

  const apply = hasFlag('apply');

  console.log('Índices de pedidos');
  console.log('------------------');
  console.log(`Modo: ${apply ? 'aplicar' : 'dry-run (sin escritura)'}`);
  console.log(`Colección: ${Order.collection.name}`);

  const schemaIndexes = Order.schema.indexes();

  console.log('\nÍndice requerido por el esquema:');

  schemaIndexes.forEach(([fields, options]) => {
    const flags = [];

    if (options?.unique) {
      flags.push('unique');
    }

    console.log(
      `- ${formatIndexFields(fields)}${
        flags.length > 0 ? ` [${flags.join(', ')}]` : ''
      }`
    );
  });

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const existingIndexes = await getExistingIndexes();
  const idempotencyIndex = findIdempotencyIndex(existingIndexes);

  console.log('\nÍndices existentes:');

  if (existingIndexes.length === 0) {
    console.log('- La colección no tiene índices o todavía no existe.');
  } else {
    existingIndexes.forEach((index) => {
      const flags = [];

      if (index.unique) {
        flags.push('unique');
      }

      console.log(
        `- ${formatIndexFields(index.key || {})}${
          flags.length > 0 ? ` [${flags.join(', ')}]` : ''
        }${index.name ? ` (${index.name})` : ''}`
      );
    });
  }

  if (idempotencyIndex && idempotencyIndex.unique !== true) {
    throw new Error(
      'Pedidos: ya existe un índice sobre idempotencyKey que no es único. El script no elimina ni modifica índices existentes.'
    );
  }

  const inspection = await inspectOrders();

  console.log(
    `\nDocumentos: ${inspection.total}; sin idempotencyKey válida: ${inspection.missingIdempotencyKeys}; claves duplicadas: ${inspection.duplicates}`
  );

  if (idempotencyIndex) {
    console.log(
      '\nEl índice único de idempotencyKey ya existe. No hay índices pendientes.'
    );
    return;
  }

  console.log('\nÍndice pendiente de crear:');
  console.log('- idempotencyKey:1 [unique]');

  if (!apply) {
    console.log(
      '\nDry-run completado. No se creó ni modificó ningún índice. Usa --apply solo con autorización expresa.'
    );
    return;
  }

  console.log('\nCreando índices...');

  await Order.createIndexes();

  const updatedIndexes = await getExistingIndexes();
  const orderIndexes = updatedIndexes.filter((index) => index.name !== '_id_');

  console.log(
    `\nPedidos: ${orderIndexes.length} índice(s) disponibles en ${Order.collection.name}.`
  );
  console.log('\nÍndice creado. No se eliminó ningún índice existente.');
}

main()
  .catch((error) => {
    const rawMessage = String(error.message || error);
    const safeMessage = rawMessage.replaceAll(
      env.MONGODB_URI,
      '[MONGODB_URI oculto]'
    );

    console.error(`\nError durante la revisión de índices: ${safeMessage}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
