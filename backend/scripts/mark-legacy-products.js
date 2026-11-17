#!/usr/bin/env node

/**
 * Marca los documentos antiguos como legacy.
 *
 * Esta operación está prevista para la Fase 3. En Fase 2 el script queda
 * preparado, pero NO debe ejecutarse con --apply.
 *
 * - Dry-run por defecto: muestra los documentos que se modificarían.
 * - `--apply` requiere además `--confirm-legacy`.
 * - Solo modifica estos campos:
 *     legacy: true
 *     available: false
 *     schemaVersion: 0
 *     legacyAt: fecha de la operación
 * - No modifica nombres, descripciones, ingredientes, precios, imágenes,
 *   fechas originales ni identificadores.
 * - No elimina documentos.
 *
 * Uso:
 *   npm run db:mark-legacy
 *   npm run db:mark-legacy -- --apply --confirm-legacy
 */

const mongoose = require('mongoose');
const env = require('../src/config/env');

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function canonicalize(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === 'object') {
    if (value._bsontype) {
      return value.toString();
    }

    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }

  return value;
}

function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function withoutLegacyFields(document) {
  const copy = { ...document };
  delete copy.legacy;
  delete copy.available;
  delete copy.schemaVersion;
  delete copy.legacyAt;
  return copy;
}

function describeDocument(document) {
  return `${document._id} (${document.name || 'sin nombre'})`;
}

async function main() {
  if (hasFlag('help')) {
    console.log('Uso:');
    console.log('  npm run db:mark-legacy');
    console.log(
      '  npm run db:mark-legacy -- --apply --confirm-legacy'
    );
    console.log('');
    console.log(
      'Sin --apply solo muestra los documentos. La operación está aplazada a Fase 3.'
    );
    return;
  }

  const apply = hasFlag('apply');
  const confirmLegacy = hasFlag('confirm-legacy');

  if (apply && !confirmLegacy) {
    throw new Error(
      'Para aplicar se requiere --confirm-legacy. Esta operación está aplazada a la Fase 3.'
    );
  }

  console.log('Marcado de productos legacy');
  console.log('---------------------------');
  console.log(`Modo: ${apply ? 'aplicar' : 'dry-run (sin escritura)'}`);

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const collection = mongoose.connection.db.collection('products');
  const documents = await collection
    .find({
      schemaVersion: { $ne: 1 },
      legacy: { $ne: true },
    })
    .sort({ _id: 1 })
    .toArray();

  console.log(`Documentos candidatos: ${documents.length}`);

  documents.forEach((document) => {
    console.log(`- ${describeDocument(document)}`);
  });

  if (documents.length === 0) {
    console.log('No hay documentos candidatos. No se modificó nada.');
    return;
  }

  if (!apply) {
    console.log(
      '\nDry-run completado. No se modificó ningún documento en MongoDB.'
    );
    console.log(
      'La aplicación real queda aplazada a la Fase 3 y requiere --apply --confirm-legacy.'
    );
    return;
  }

  const before = documents.map((document) => ({ ...document }));
  const ids = documents.map((document) => document._id);
  const legacyAt = new Date();

  const result = await collection.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        legacy: true,
        available: false,
        schemaVersion: 0,
        legacyAt,
      },
    }
  );

  const after = await collection
    .find({ _id: { $in: ids } })
    .sort({ _id: 1 })
    .toArray();
  const afterById = new Map(
    after.map((document) => [document._id.toString(), document])
  );

  for (const original of before) {
    const updated = afterById.get(original._id.toString());

    if (!updated) {
      throw new Error(
        `No se encontró el documento ${original._id} después de la actualización.`
      );
    }

    if (
      stableStringify(withoutLegacyFields(original)) !==
      stableStringify(withoutLegacyFields(updated))
    ) {
      throw new Error(
        `El documento ${original._id} cambió en campos no autorizados.`
      );
    }

    if (
      updated.legacy !== true ||
      updated.available !== false ||
      updated.schemaVersion !== 0 ||
      !(updated.legacyAt instanceof Date)
    ) {
      throw new Error(
        `El documento ${original._id} no tiene los campos legacy esperados.`
      );
    }
  }

  console.log('\nMarcado aplicado');
  console.log('----------------');
  console.log(`- Documentos encontrados: ${result.matchedCount}`);
  console.log(`- Documentos modificados: ${result.modifiedCount}`);
  console.log('- Campos modificados: legacy, available, schemaVersion, legacyAt');
  console.log('- No se eliminó ningún documento.');
  console.log(
    '- Verificación: el resto de los campos se mantuvo sin cambios.'
  );
}

main()
  .catch((error) => {
    const rawMessage = String(error.message || error);
    const safeMessage = rawMessage.replaceAll(
      env.MONGODB_URI,
      '[MONGODB_URI oculto]'
    );

    console.error(`\nError durante el marcado legacy: ${safeMessage}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
