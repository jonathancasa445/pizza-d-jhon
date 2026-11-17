#!/usr/bin/env node

/**
 * Restauración controlada de una colección desde un respaldo Extended JSON.
 *
 * Características:
 * - Dry-run por defecto: compara el respaldo con MongoDB y no escribe nada.
 * - Restaura documentos por `_id`.
 * - No elimina documentos que no estén incluidos en el respaldo.
 * - Informa qué documentos crearía, actualizaría, dejaría sin cambios u
 *   omitiría por ser más recientes en la base de datos.
 * - No sobrescribe documentos más recientes sin `--allow-overwrite-newer`.
 * - Verifica el SHA-256 y el conteo contra la metadata del respaldo.
 *
 * Colecciones:
 * - Restaura la colección indicada con `--collection` (por defecto `products`).
 * - El respaldo generado en Fase 2 contiene únicamente `products`.
 * - Está validado para documentos que tengan `_id`; no borra nada.
 *
 * Uso:
 *   npm run db:restore
 *   npm run db:restore -- --file=backups/products-....json
 *   npm run db:restore -- --file=backups/products-....json --apply
 *   npm run db:restore -- --apply --allow-overwrite-newer
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const env = require('../src/config/env');

const { EJSON } = mongoose.mongo.BSON;
const BACKUP_DIR = path.resolve(__dirname, '../backups');

function readArgument(name, fallback) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));

  return argument ? argument.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function sha256(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function validateCollectionName(collectionName) {
  if (!/^[a-zA-Z0-9_-]+$/.test(collectionName)) {
    throw new Error(
      'El nombre de la colección solo puede contener letras, números, guiones y guiones bajos.'
    );
  }
}

function findLatestBackup(collectionName) {
  if (!fs.existsSync(BACKUP_DIR)) {
    throw new Error(`No existe el directorio de respaldos: ${BACKUP_DIR}`);
  }

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter(
      (fileName) =>
        fileName.startsWith(`${collectionName}-`) &&
        fileName.endsWith('.json') &&
        !fileName.endsWith('.meta.json')
    )
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error(
      `No se encontró ningún respaldo para la colección "${collectionName}".`
    );
  }

  return path.join(BACKUP_DIR, files[0]);
}

function resolveBackupPath(fileArgument, collectionName) {
  if (!fileArgument) {
    return findLatestBackup(collectionName);
  }

  return path.isAbsolute(fileArgument)
    ? fileArgument
    : path.resolve(process.cwd(), fileArgument);
}

function getMetadataPath(backupPath) {
  return backupPath.replace(/\.json$/, '.meta.json');
}

function loadAndVerifyBackup(backupPath, collectionName) {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`No existe el archivo de respaldo: ${backupPath}`);
  }

  const content = fs.readFileSync(backupPath, 'utf8');
  const metadataPath = getMetadataPath(backupPath);

  if (!fs.existsSync(metadataPath)) {
    throw new Error(
      `No se encontró la metadata de verificación: ${metadataPath}. No se restaura un respaldo no verificable.`
    );
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

  if (metadata.collection !== collectionName) {
    throw new Error(
      `La metadata indica la colección "${metadata.collection}", pero se solicitó "${collectionName}".`
    );
  }

  if (metadata.verified !== true) {
    throw new Error('La metadata no marca el respaldo como verificado.');
  }

  if (!metadata.sha256) {
    throw new Error(
      'La metadata no contiene SHA-256. No se restaura un respaldo no verificable.'
    );
  }

  if (metadata.documentCount !== undefined) {
    const documents = EJSON.parse(content, { relaxed: false });

    if (!Array.isArray(documents)) {
      throw new Error('El respaldo no contiene un array válido.');
    }

    if (documents.length !== metadata.documentCount) {
      throw new Error(
        `El respaldo contiene ${documents.length} documentos, pero la metadata indica ${metadata.documentCount}.`
      );
    }
  }

  const checksum = sha256(content);

  if (metadata.sha256 !== checksum) {
    throw new Error(
      'El SHA-256 del respaldo no coincide con la metadata. No se restaura.'
    );
  }

  const documents = EJSON.parse(content, { relaxed: false });

  if (!Array.isArray(documents)) {
    throw new Error('El respaldo no contiene un array válido.');
  }

  for (const document of documents) {
    if (!document || !document._id) {
      throw new Error(
        'Todos los documentos del respaldo deben tener un _id para poder restaurarse por _id.'
      );
    }
  }

  return {
    documents,
    metadata,
    metadataPath,
    checksum,
  };
}

function canonicalize(value) {
  if (value instanceof Date) {
    return { $date: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === 'object') {
    if (value._bsontype) {
      return value;
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
  return EJSON.stringify(canonicalize(value), null, 0, {
    relaxed: false,
  });
}

function getDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getUpdatedAt(document) {
  return getDate(document && document.updatedAt);
}

function describeDocument(document) {
  const name = document && document.name ? ` (${document.name})` : '';
  return `${document._id}${name}`;
}

function classifyDocument(backupDocument, databaseDocument, allowOverwriteNewer) {
  if (!databaseDocument) {
    return 'create';
  }

  if (stableStringify(backupDocument) === stableStringify(databaseDocument)) {
    return 'unchanged';
  }

  const backupUpdatedAt = getUpdatedAt(backupDocument);
  const databaseUpdatedAt = getUpdatedAt(databaseDocument);
  const databaseIsNewer =
    databaseUpdatedAt &&
    (!backupUpdatedAt || databaseUpdatedAt > backupUpdatedAt);

  if (databaseIsNewer && !allowOverwriteNewer) {
    return 'skip-newer';
  }

  return 'update';
}

function actionLabel(action) {
  switch (action) {
    case 'create':
      return 'crear';
    case 'update':
      return 'actualizar';
    case 'unchanged':
      return 'sin cambios';
    case 'skip-newer':
      return 'omitir (la base tiene datos más recientes)';
    default:
      return action;
  }
}

async function main() {
  if (hasFlag('help')) {
    console.log('Uso:');
    console.log('  npm run db:restore');
    console.log('  npm run db:restore -- --file=backups/products-....json');
    console.log(
      '  npm run db:restore -- --file=backups/products-....json --apply'
    );
    console.log(
      '  npm run db:restore -- --apply --allow-overwrite-newer'
    );
    console.log('');
    console.log(
      'Sin --apply solo compara e informa. Con --apply restaura por _id sin eliminar documentos.'
    );
    console.log(
      '--allow-overwrite-newer permite sobrescribir documentos de la base con updatedAt más reciente.'
    );
    return;
  }

  const apply = hasFlag('apply');
  const allowOverwriteNewer = hasFlag('allow-overwrite-newer');
  const collectionName = readArgument('collection', 'products');
  const fileArgument = readArgument('file', null);

  validateCollectionName(collectionName);

  const backupPath = resolveBackupPath(fileArgument, collectionName);
  const backup = loadAndVerifyBackup(backupPath, collectionName);

  console.log('Restauración controlada');
  console.log('-----------------------');
  console.log(`Colección: ${collectionName}`);
  console.log(`Respaldo: ${path.relative(process.cwd(), backupPath)}`);
  console.log(`Documentos en respaldo: ${backup.documents.length}`);
  console.log(`SHA-256 verificado: ${backup.checksum}`);
  console.log(`Modo: ${apply ? 'aplicar' : 'dry-run (sin escritura)'}`);
  console.log(
    `Sobrescribir datos más recientes: ${
      allowOverwriteNewer ? 'sí' : 'no'
    }`
  );

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const collection = mongoose.connection.db.collection(collectionName);
  const ids = backup.documents.map((document) => document._id);
  const databaseDocuments = await collection
    .find({ _id: { $in: ids } })
    .toArray();
  const databaseById = new Map(
    databaseDocuments.map((document) => [document._id.toString(), document])
  );

  const actions = backup.documents.map((backupDocument) => {
    const databaseDocument = databaseById.get(
      backupDocument._id.toString()
    );
    const action = classifyDocument(
      backupDocument,
      databaseDocument,
      allowOverwriteNewer
    );

    return {
      backupDocument,
      databaseDocument,
      action,
    };
  });

  const counts = actions.reduce((result, item) => {
    result[item.action] = (result[item.action] || 0) + 1;
    return result;
  }, {});

  console.log('\nClasificación:');
  actions.forEach(({ backupDocument, action }) => {
    console.log(`- ${describeDocument(backupDocument)}: ${actionLabel(action)}`);
  });

  console.log('\nResumen:');
  console.log(`- Crear: ${counts.create || 0}`);
  console.log(`- Actualizar: ${counts.update || 0}`);
  console.log(`- Sin cambios: ${counts.unchanged || 0}`);
  console.log(`- Omitir por datos más recientes: ${counts['skip-newer'] || 0}`);

  if (!apply) {
    console.log(
      '\nDry-run completado. No se modificó ningún documento en MongoDB.'
    );
    return;
  }

  let created = 0;
  let updated = 0;

  for (const { backupDocument, action } of actions) {
    if (action !== 'create' && action !== 'update') {
      continue;
    }

    await collection.replaceOne(
      { _id: backupDocument._id },
      backupDocument,
      { upsert: true }
    );

    if (action === 'create') {
      created += 1;
    } else {
      updated += 1;
    }
  }

  console.log('\nRestauración aplicada');
  console.log('---------------------');
  console.log(`- Documentos creados: ${created}`);
  console.log(`- Documentos actualizados: ${updated}`);
  console.log(
    `- Documentos omitidos por datos más recientes: ${
      counts['skip-newer'] || 0
    }`
  );
  console.log(
    '- Documentos de MongoDB que no estaban en el respaldo: no se eliminaron.'
  );
}

main()
  .catch((error) => {
    const rawMessage = String(error.message || error);
    const safeMessage = rawMessage.replaceAll(
      env.MONGODB_URI,
      '[MONGODB_URI oculto]'
    );

    console.error(`\nError durante la restauración: ${safeMessage}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
