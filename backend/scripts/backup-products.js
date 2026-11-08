#!/usr/bin/env node

/**
 * Respaldo lógico de una colección de MongoDB en Extended JSON.
 *
 * Es una operación de solo lectura sobre MongoDB: no modifica documentos.
 * El archivo resultante y su metadata se guardan en backend/backups/.
 *
 * Uso:
 *   npm run db:backup
 *   npm run db:backup -- --collection=products
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

function buildTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sha256(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function main() {
  if (hasFlag('help')) {
    console.log('Uso: npm run db:backup -- [--collection=products]');
    console.log(
      'Exporta la colección indicada a backend/backups/ en Extended JSON.'
    );
    return;
  }

  const collectionName = readArgument('collection', 'products');

  if (!/^[a-zA-Z0-9_-]+$/.test(collectionName)) {
    throw new Error(
      'El nombre de la colección solo puede contener letras, números, guiones y guiones bajos.'
    );
  }

  console.log('Respaldo de solo lectura');
  console.log('------------------------');

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const db = mongoose.connection.db;
  const collection = db.collection(collectionName);
  const documents = await collection
    .find({})
    .sort({ _id: 1 })
    .toArray();

  const timestamp = buildTimestamp();
  const baseName = `${collectionName}-${timestamp}`;
  const backupPath = path.join(BACKUP_DIR, `${baseName}.json`);
  const metadataPath = path.join(BACKUP_DIR, `${baseName}.meta.json`);

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const content = EJSON.stringify(documents, null, 2, {
    relaxed: false,
  });

  fs.writeFileSync(backupPath, content, 'utf8');

  // Verificación: se vuelve a leer el archivo y se compara la cantidad.
  const savedContent = fs.readFileSync(backupPath, 'utf8');
  const parsedDocuments = EJSON.parse(savedContent, {
    relaxed: false,
  });

  if (!Array.isArray(parsedDocuments)) {
    throw new Error('El archivo de respaldo no contiene un array válido.');
  }

  if (parsedDocuments.length !== documents.length) {
    throw new Error(
      `Verificación fallida: MongoDB devolvió ${documents.length} documentos y el archivo contiene ${parsedDocuments.length}.`
    );
  }

  const checksum = sha256(savedContent);
  const bytes = Buffer.byteLength(savedContent, 'utf8');

  const metadata = {
    collection: collectionName,
    documentCount: documents.length,
    file: path.basename(backupPath),
    bytes,
    sha256: checksum,
    format: 'MongoDB Extended JSON (relaxed: false)',
    createdAt: new Date().toISOString(),
    verified: true,
    script: 'backend/scripts/backup-products.js',
  };

  fs.writeFileSync(
    metadataPath,
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf8'
  );

  const relativeBackupPath = path.relative(process.cwd(), backupPath);
  const relativeMetadataPath = path.relative(
    process.cwd(),
    metadataPath
  );

  console.log(`Colección: ${collectionName}`);
  console.log(`Documentos exportados: ${documents.length}`);
  console.log(`Archivo: ${relativeBackupPath}`);
  console.log(`Metadata: ${relativeMetadataPath}`);
  console.log(`Tamaño: ${bytes} bytes`);
  console.log(`SHA-256: ${checksum}`);
  console.log('Verificación: correcta (conteo y lectura del archivo)');
  console.log('MongoDB: no se modificó ningún documento.');
}

main()
  .catch((error) => {
    const safeMessage = String(error.message || error).replaceAll(
      env.MONGODB_URI,
      '[MONGODB_URI oculto]'
    );

    console.error(`\nError durante el respaldo: ${safeMessage}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
