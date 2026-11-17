#!/usr/bin/env node

/**
 * Creación controlada de índices para el catálogo nuevo.
 *
 * - Dry-run por defecto: conecta en modo lectura para revisar duplicados y
 *   muestra los índices que se crearían, pero no escribe nada.
 * - `--apply` crea los índices definidos con `createIndexes()`.
 * - No usa `syncIndexes()` y no elimina índices existentes.
 * - Antes de crear índices únicos por `key`, verifica claves duplicadas y
 *   documentos incompatibles.
 *
 * Uso:
 *   npm run db:indexes
 *   npm run db:indexes -- --apply
 */

const mongoose = require('mongoose');
const env = require('../src/config/env');
const Product = require('../src/models/Product');
const MenuSection = require('../src/models/MenuSection');
const Addon = require('../src/models/Addon');

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function formatIndexFields(fields) {
  return Object.entries(fields)
    .map(([field, direction]) => `${field}:${direction}`)
    .join(', ');
}

async function inspectKeys(Model, { allowMissingKeys, label }) {
  const documents = await Model.collection
    .find({}, { projection: { key: 1, name: 1 } })
    .toArray();

  const missingKeys = [];
  const invalidKeys = [];
  const seen = new Map();
  const duplicates = [];

  for (const document of documents) {
    if (typeof document.key !== 'string' || document.key.length === 0) {
      missingKeys.push(document);
      continue;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(document.key)) {
      invalidKeys.push(document);
      continue;
    }

    if (seen.has(document.key)) {
      duplicates.push({
        key: document.key,
        ids: [seen.get(document.key), document._id],
      });
      continue;
    }

    seen.set(document.key, document._id);
  }

  if (!allowMissingKeys && missingKeys.length > 0) {
    throw new Error(
      `${label}: hay ${missingKeys.length} documentos sin key válida. No se puede crear el índice único.`
    );
  }

  if (invalidKeys.length > 0) {
    throw new Error(
      `${label}: hay ${invalidKeys.length} documentos con key que no cumple el formato permitido.`
    );
  }

  if (duplicates.length > 0) {
    const detail = duplicates
      .slice(0, 5)
      .map((item) => `${item.key} (${item.ids.join(', ')})`)
      .join('; ');

    throw new Error(
      `${label}: hay ${duplicates.length} claves duplicadas. No se puede crear el índice único. Detalle: ${detail}`
    );
  }

  return {
    total: documents.length,
    missingKeys: missingKeys.length,
    invalidKeys: invalidKeys.length,
    duplicates: duplicates.length,
    uniqueKeys: seen.size,
  };
}

async function main() {
  if (hasFlag('help')) {
    console.log('Uso:');
    console.log('  npm run db:indexes');
    console.log('  npm run db:indexes -- --apply');
    console.log('');
    console.log(
      'Sin --apply solo revisa y muestra los índices. Con --apply los crea sin eliminar índices existentes.'
    );
    return;
  }

  const apply = hasFlag('apply');

  console.log('Índices del catálogo');
  console.log('--------------------');
  console.log(`Modo: ${apply ? 'aplicar' : 'dry-run (sin escritura)'}`);

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const models = [
    {
      label: 'Productos',
      model: Product,
      allowMissingKeys: true,
    },
    {
      label: 'Secciones',
      model: MenuSection,
      allowMissingKeys: false,
    },
    {
      label: 'Adicionales',
      model: Addon,
      allowMissingKeys: false,
    },
  ];

  const inspections = [];

  for (const item of models) {
    const indexDefinitions = item.model.schema.indexes();

    console.log(`\n${item.label} (${item.model.collection.name}):`);

    indexDefinitions.forEach(([fields, options]) => {
      const flags = [];

      if (options && options.unique) {
        flags.push('unique');
      }

      if (options && options.partialFilterExpression) {
        flags.push(
          `partial=${JSON.stringify(options.partialFilterExpression)}`
        );
      }

      console.log(
        `- ${formatIndexFields(fields)}${
          flags.length > 0 ? ` [${flags.join(', ')}]` : ''
        }`
      );
    });

    const inspection = await inspectKeys(item.model, {
      allowMissingKeys: item.allowMissingKeys,
      label: item.label,
    });

    inspections.push({
      ...item,
      inspection,
    });

    console.log(
      `  Documentos: ${inspection.total}; claves únicas: ${inspection.uniqueKeys}; sin key: ${inspection.missingKeys}; duplicadas: ${inspection.duplicates}`
    );
  }

  if (!apply) {
    console.log(
      '\nDry-run completado. No se creó ni modificó ningún índice.'
    );
    return;
  }

  console.log('\nCreando índices...');

  for (const item of inspections) {
    const created = await item.model.createIndexes();

    console.log(
      `- ${item.label}: ${created.length} índice(s) disponibles en ${item.model.collection.name}.`
    );
  }

  console.log(
    '\nÍndices creados. No se eliminó ningún índice existente.'
  );
}

main()
  .catch((error) => {
    const rawMessage = String(error.message || error);
    const safeMessage = rawMessage.replaceAll(
      env.MONGODB_URI,
      '[MONGODB_URI oculto]'
    );

    console.error(`\nError durante la creación de índices: ${safeMessage}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
