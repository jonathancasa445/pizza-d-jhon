#!/usr/bin/env node

/**
 * Seed preparado para la nueva estructura del catálogo.
 *
 * IMPORTANTE:
 * - Por defecto se ejecuta en modo dry-run: valida los datos y no conecta
 *   con MongoDB.
 * - Solo escribe si se ejecuta con --apply.
 * - No elimina documentos existentes.
 * - Los documentos antiguos sin `key` no se tocan.
 * - Los precios se guardan en centavos enteros para evitar errores de
 *   precisión. Ejemplo: 1000 = USD 10.00.
 *
 * Uso:
 *   npm run db:seed
 *   npm run db:seed -- --apply
 */

const SECTION_DOCUMENTS = [
  {
    key: 'pizzas-familiares',
    name: 'Pizzas familiares',
    description: '',
    imageUrl: '',
    order: 1,
    active: true,
    kind: 'pizza-presentation',
    presentationKey: 'familiar',
  },
  {
    key: 'pizzas-medianas',
    name: 'Pizzas medianas',
    description: '',
    imageUrl: '',
    order: 2,
    active: true,
    kind: 'pizza-presentation',
    presentationKey: 'mediana',
  },
  {
    key: 'pizzas-de-borde',
    name: 'Pizzas de borde',
    description: '',
    imageUrl: '',
    order: 3,
    active: true,
    kind: 'pizza-presentation',
    presentationKey: 'borde',
  },
  {
    key: 'alitas',
    name: 'Alitas',
    description: '',
    imageUrl: '',
    order: 4,
    active: true,
    kind: 'standard',
    presentationKey: null,
  },
  {
    key: 'acompanantes',
    name: 'Acompañantes',
    description: '',
    imageUrl: '',
    order: 5,
    active: true,
    kind: 'standard',
    presentationKey: null,
  },
  {
    key: 'bebidas',
    name: 'Bebidas',
    description: '',
    imageUrl: '',
    order: 6,
    active: true,
    kind: 'standard',
    presentationKey: null,
  },
];

const PRESENTATION_VARIANTS = [
  {
    key: 'familiar',
    name: 'Familiar',
    priceCents: 1000,
    available: true,
    order: 1,
  },
  {
    key: 'mediana',
    name: 'Mediana',
    priceCents: 500,
    available: true,
    order: 2,
  },
  {
    key: 'borde',
    name: 'De borde',
    priceCents: 1200,
    available: true,
    order: 3,
  },
];

const PIZZA_DEFINITIONS = [
  { key: 'pizza-jamon', name: 'Jamón' },
  { key: 'pizza-pepperoni', name: 'Pepperoni' },
  { key: 'pizza-hawaiana', name: 'Hawaiana' },
  { key: 'pizza-amante-a-la-carne', name: 'Amante a la carne' },
  { key: 'pizza-suprema', name: 'Suprema' },
  { key: 'pizza-continental', name: 'Continental' },
  { key: 'pizza-mixta', name: 'Mixta', isMix: true },
];

const ADDON_DEFINITIONS = [
  { key: 'queso-extra', name: 'Queso extra' },
  { key: 'jamon-extra', name: 'Jamón extra' },
  { key: 'pepperoni-extra', name: 'Pepperoni extra' },
  { key: 'pina', name: 'Piña' },
  { key: 'tocino', name: 'Tocino' },
  { key: 'chorizo', name: 'Chorizo' },
  { key: 'mix-de-vegetales', name: 'Mix de vegetales' },
  { key: 'champinon', name: 'Champiñón' },
  { key: 'salami', name: 'Salami' },
];

function buildProducts() {
  return PIZZA_DEFINITIONS.map((definition, index) => ({
    key: definition.key,
    name: definition.name,
    // Los textos reales no fueron proporcionados. No se inventan.
    description: '',
    imageUrl: '',
    kind: 'pizza',
    categoryKey: null,
    ingredients: [],
    variantLabel: 'Presentación',
    variants: PRESENTATION_VARIANTS.map((variant) => ({ ...variant })),
    optionGroups: [],
    addonGroupKeys: ['pizza-extras'],
    isMix: Boolean(definition.isMix),
    mixConfig: definition.isMix
      ? {
          flavorCount: 2,
          distinctFlavors: true,
          allowedFlavorKeys: [],
        }
      : null,
    available: true,
    order: index + 1,
    schemaVersion: 1,
  }));
}

function buildAddons() {
  return ADDON_DEFINITIONS.map((definition, index) => ({
    key: definition.key,
    name: definition.name,
    // Precio pendiente de configuración. No se asume gratuito.
    priceCents: null,
    imageUrl: '',
    groupKey: 'pizza-extras',
    appliesToKinds: ['pizza'],
    available: true,
    order: index + 1,
    schemaVersion: 1,
  }));
}

const CATALOG = {
  sections: SECTION_DOCUMENTS,
  products: buildProducts(),
  addons: buildAddons(),
};

function assertUniqueKeys(items, label) {
  const seen = new Set();

  for (const item of items) {
    if (!item.key || typeof item.key !== 'string') {
      throw new Error(`${label}: hay un elemento sin key válida.`);
    }

    if (seen.has(item.key)) {
      throw new Error(`${label}: key duplicada "${item.key}".`);
    }

    seen.add(item.key);
  }
}

function assertValidPrice(priceCents, label) {
  if (priceCents === null) {
    return;
  }

  if (
    !Number.isInteger(priceCents) ||
    priceCents < 0
  ) {
    throw new Error(
      `${label}: priceCents debe ser un entero mayor o igual a 0, o null.`
    );
  }
}

function validateCatalog() {
  assertUniqueKeys(CATALOG.sections, 'Secciones');
  assertUniqueKeys(CATALOG.products, 'Productos');
  assertUniqueKeys(CATALOG.addons, 'Adicionales');

  for (const product of CATALOG.products) {
    if (!Array.isArray(product.variants) || product.variants.length === 0) {
      throw new Error(
        `Producto "${product.key}": debe tener al menos una variante.`
      );
    }

    assertUniqueKeys(product.variants, `Variantes de "${product.key}"`);

    for (const variant of product.variants) {
      assertValidPrice(
        variant.priceCents,
        `Producto "${product.key}", variante "${variant.key}"`
      );
    }

    if (product.isMix) {
      if (
        !product.mixConfig ||
        product.mixConfig.flavorCount !== 2 ||
        product.mixConfig.distinctFlavors !== true
      ) {
        throw new Error(
          `Producto "${product.key}": la configuración de mixta debe exigir exactamente dos sabores diferentes.`
        );
      }
    }
  }

  for (const addon of CATALOG.addons) {
    assertValidPrice(addon.priceCents, `Adicional "${addon.key}"`);
  }
}

function printSummary() {
  console.log('Seed del catálogo preparado');
  console.log('---------------------------');
  console.log(`Secciones: ${CATALOG.sections.length}`);
  console.log(`Productos: ${CATALOG.products.length}`);
  console.log(`Adicionales: ${CATALOG.addons.length}`);
  console.log('\nSecciones:');
  CATALOG.sections.forEach((section) => {
    console.log(`- ${section.key} (${section.name})`);
  });
  console.log('\nProductos:');
  CATALOG.products.forEach((product) => {
    const mixLabel = product.isMix ? ' [mixta]' : '';
    console.log(`- ${product.key} (${product.name})${mixLabel}`);
  });
  console.log('\nAdicionales (todos con precio pendiente):');
  CATALOG.addons.forEach((addon) => {
    console.log(`- ${addon.key} (${addon.name})`);
  });
  console.log(
    '\nModo dry-run: no se conectó a MongoDB y no se escribió nada.'
  );
  console.log(
    'Para aplicar los cambios de forma idempotente: npm run db:seed -- --apply'
  );
  console.log(
    'El seed no elimina documentos antiguos ni modifica documentos sin key.'
  );
}

async function applyCatalog() {
  const mongoose = require('mongoose');
  const env = require('../src/config/env');
  const { sections, products, addons } = CATALOG;

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const db = mongoose.connection.db;
  const now = new Date();

  async function upsertCollection(collectionName, documents) {
    const collection = db.collection(collectionName);
    const operations = documents.map((document) => ({
      updateOne: {
        filter: { key: document.key },
        update: {
          $set: {
            ...document,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        upsert: true,
      },
    }));

    const result = await collection.bulkWrite(operations, {
      ordered: false,
    });

    return {
      collection: collectionName,
      matched: result.matchedCount,
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    };
  }

  const results = [];

  results.push(await upsertCollection('menusections', sections));
  results.push(await upsertCollection('products', products));
  results.push(await upsertCollection('addons', addons));

  console.log('Seed aplicado');
  console.log('-------------');
  results.forEach((result) => {
    console.log(
      `- ${result.collection}: matched=${result.matched}, upserted=${result.upserted}, modified=${result.modified}`
    );
  });
  console.log('No se eliminó ningún documento.');
}

async function main() {
  const apply = process.argv.includes('--apply');
  const help = process.argv.includes('--help');

  if (help) {
    console.log('Uso:');
    console.log('  npm run db:seed');
    console.log('  npm run db:seed -- --apply');
    console.log('');
    console.log(
      'Sin --apply solo valida y muestra el resumen. Con --apply hace upsert por key.'
    );
    return;
  }

  validateCatalog();
  printSummary();

  if (!apply) {
    return;
  }

  await applyCatalog();
}

main()
  .catch((error) => {
    const rawMessage = String(error.message || error);
    const mongoUri = process.env.MONGODB_URI;
    const safeMessage = mongoUri
      ? rawMessage.replaceAll(mongoUri, '[MONGODB_URI oculto]')
      : rawMessage;

    console.error(`\nError durante el seed: ${safeMessage}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = require('mongoose');
    await mongoose.connection.close();
  });
