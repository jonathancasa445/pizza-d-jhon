#!/usr/bin/env node

/**
 * Inspección de solo lectura de la base de datos.
 *
 * No modifica documentos ni colecciones. Su objetivo es conocer el estado
 * actual antes de preparar una migración.
 *
 * Uso:
 *   npm run db:inspect
 */

const mongoose = require('mongoose');
const env = require('../src/config/env');

const PRODUCTS_COLLECTION = process.env.PRODUCTS_COLLECTION || 'products';
const EXPECTED_FIELDS = [
  'name',
  'description',
  'ingredients',
  'price',
  'imageUrl',
  'category',
  'available',
];

function describeType(value) {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (value instanceof Date) {
    return 'date';
  }

  if (value && typeof value === 'object' && value._bsontype) {
    return value._bsontype;
  }

  return typeof value;
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function groupBy(items, getKey) {
  const groups = new Map();

  for (const item of items) {
    const key = getKey(item);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(item);
  }

  return groups;
}

function findDuplicates(items, getKey) {
  return [...groupBy(items, getKey).entries()]
    .filter(([, groupedItems]) => groupedItems.length > 1)
    .map(([key, groupedItems]) => ({
      key,
      ids: groupedItems.map((item) => String(item._id)),
      names: groupedItems.map((item) => item.name ?? '(sin nombre)'),
    }));
}

function printFieldSummary(documents) {
  const fields = new Map();

  for (const document of documents) {
    for (const [field, value] of Object.entries(document)) {
      if (!fields.has(field)) {
        fields.set(field, {
          count: 0,
          types: new Map(),
        });
      }

      const fieldInfo = fields.get(field);
      fieldInfo.count += 1;

      const type = describeType(value);
      fieldInfo.types.set(type, (fieldInfo.types.get(type) || 0) + 1);
    }
  }

  console.log('\nCampos encontrados:');

  if (fields.size === 0) {
    console.log('- No hay documentos para analizar.');
    return;
  }

  for (const [field, info] of [...fields.entries()].sort()) {
    const types = [...info.types.entries()]
      .map(([type, count]) => `${type} (${count})`)
      .join(', ');

    console.log(
      `- ${field}: ${info.count}/${documents.length} documentos; tipos: ${types}`
    );
  }

  const missingFields = EXPECTED_FIELDS.filter(
    (field) => !fields.has(field)
  );

  if (missingFields.length > 0) {
    console.log(
      `\nCampos esperados por el modelo actual que no aparecen: ${missingFields.join(
        ', '
      )}`
    );
  }
}

function printDocumentSummary(documents) {
  console.log('\nDocumentos actuales:');

  if (documents.length === 0) {
    console.log('- La colección está vacía.');
    return;
  }

  documents.slice(0, 100).forEach((document, index) => {
    const ingredients = Array.isArray(document.ingredients)
      ? document.ingredients.length
      : 'no-array';
    const ingredientList = Array.isArray(document.ingredients)
      ? JSON.stringify(document.ingredients)
      : String(document.ingredients);

    console.log(
      [
        `${index + 1}. _id=${String(document._id)}`,
        `name="${document.name ?? '(sin nombre)'}"`,
        `description="${document.description ?? ''}"`,
        `price=${document.price ?? '(sin precio)'}`,
        `category="${document.category ?? '(sin categoría)'}"`,
        `available=${document.available ?? '(sin campo)'}`,
        `ingredients=${ingredients} ${ingredientList}`,
        `imageUrl="${document.imageUrl ?? ''}"`,
        `createdAt=${document.createdAt ? new Date(document.createdAt).toISOString() : '(sin fecha)'}`,
      ].join(' | ')
    );
  });

  if (documents.length > 100) {
    console.log(`... y ${documents.length - 100} documentos más.`);
  }
}

function printValueSummary(documents) {
  const prices = documents
    .map((document) => document.price)
    .filter((price) => typeof price === 'number');

  const categories = groupBy(documents, (document) =>
    String(document.category ?? '(sin categoría)')
  );

  const availableCount = documents.filter(
    (document) => document.available === true
  ).length;

  const emptyImages = documents.filter(
    (document) => !document.imageUrl
  ).length;

  console.log('\nResumen de valores:');

  if (prices.length > 0) {
    const uniquePrices = [...new Set(prices)].sort((a, b) => a - b);
    console.log(
      `- Precios: mínimo=${Math.min(...prices)}, máximo=${Math.max(
        ...prices
      )}, valores distintos=${uniquePrices.join(', ')}`
    );
  } else {
    console.log('- Precios: no hay valores numéricos.');
  }

  console.log(
    `- Disponibles: ${availableCount}/${documents.length}; sin imagen: ${emptyImages}/${documents.length}`
  );

  console.log('- Categorías:');
  for (const [category, items] of categories.entries()) {
    console.log(`  - "${category}": ${items.length}`);
  }
}

function printDuplicates(documents) {
  const duplicatesByName = findDuplicates(documents, (document) =>
    normalizeText(document.name)
  );
  const duplicatesByNameAndPrice = findDuplicates(
    documents,
    (document) =>
      `${normalizeText(document.name)}::${String(document.price)}`
  );
  const documentsWithKey = documents.filter(
    (document) => document.key !== undefined
  );
  const duplicatesByKey = findDuplicates(documentsWithKey, (document) =>
    normalizeText(document.key)
  );

  console.log('\nPosibles duplicados:');

  if (
    duplicatesByName.length === 0 &&
    duplicatesByNameAndPrice.length === 0 &&
    duplicatesByKey.length === 0
  ) {
    console.log('- No se detectaron duplicados por nombre, nombre+precio ni key.');
    return;
  }

  if (duplicatesByName.length > 0) {
    console.log('- Por nombre:');
    duplicatesByName.forEach((duplicate) => {
      console.log(
        `  - "${duplicate.key}": ${duplicate.ids.join(', ')}`
      );
    });
  }

  if (duplicatesByNameAndPrice.length > 0) {
    console.log('- Por nombre+precio:');
    duplicatesByNameAndPrice.forEach((duplicate) => {
      console.log(
        `  - "${duplicate.key}": ${duplicate.ids.join(', ')}`
      );
    });
  }

  if (duplicatesByKey.length > 0) {
    console.log('- Por key:');
    duplicatesByKey.forEach((duplicate) => {
      console.log(
        `  - "${duplicate.key}": ${duplicate.ids.join(', ')}`
      );
    });
  }
}

async function main() {
  console.log('Inspección de solo lectura de MongoDB');
  console.log('------------------------------------');

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const db = mongoose.connection.db;
  const collections = await db
    .listCollections({}, { nameOnly: true })
    .toArray();

  console.log('\nColecciones encontradas:');

  for (const collectionInfo of collections) {
    const count = await db
      .collection(collectionInfo.name)
      .countDocuments();

    console.log(`- ${collectionInfo.name}: ${count} documentos`);
  }

  const collection = db.collection(PRODUCTS_COLLECTION);
  const documents = await collection
    .find({})
    .sort({ _id: 1 })
    .toArray();

  console.log(
    `\nColección analizada: ${PRODUCTS_COLLECTION} (${documents.length} documentos)`
  );

  const indexes = await collection.indexes();

  console.log('\nÍndices actuales:');
  indexes.forEach((index) => {
    const keys = Object.entries(index.key)
      .map(([field, direction]) => `${field}:${direction}`)
      .join(', ');

    console.log(
      `- ${index.name}: { ${keys} }${index.unique ? ' [unique]' : ''}`
    );
  });

  printDocumentSummary(documents);
  printFieldSummary(documents);
  printValueSummary(documents);
  printDuplicates(documents);

  console.log(
    '\nInspección completada. No se modificó ningún documento.'
  );
}

main()
  .catch((error) => {
    const safeMessage = String(error.message || error).replaceAll(
      env.MONGODB_URI,
      '[MONGODB_URI oculto]'
    );

    console.error(`\nError durante la inspección: ${safeMessage}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
