#!/usr/bin/env node

/**
 * Seed del catálogo nuevo (Fase 2).
 *
 * IMPORTANTE:
 * - Por defecto se ejecuta en modo dry-run: valida los datos con los modelos
 *   de Mongoose y no conecta con MongoDB.
 * - Solo escribe si se ejecuta con --apply y con autorización explícita.
 * - No elimina documentos existentes.
 * - Los documentos antiguos sin `key` no se tocan.
 * - Los precios se guardan en centavos enteros para evitar errores de
 *   precisión. Ejemplo: 1000 = USD 10.00.
 * - `priceCents: null` significa "Precio por definir"; no es gratuito.
 *
 * Uso:
 *   npm run db:seed
 *   npm run db:seed -- --apply
 */

const MenuSection = require('../src/models/MenuSection');
const Product = require('../src/models/Product');
const Addon = require('../src/models/Addon');
const {
  PIZZA_ADDON_GROUP_KEY,
  MAX_ADDON_QUANTITY_PER_ADDON,
} = require('../src/constants/catalog');

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
    addonGroupKeys: [PIZZA_ADDON_GROUP_KEY],
    isMix: Boolean(definition.isMix),
    mixConfig: definition.isMix
      ? {
          flavorCount: 2,
          distinctFlavors: true,
          // null = todos los sabores normales disponibles.
          // [] = ningún sabor; lista = solo las claves indicadas.
          allowedFlavorKeys: null,
        }
      : null,
    available: true,
    order: index + 1,
    schemaVersion: 1,
    legacy: false,
  }));
}

function buildAddons() {
  return ADDON_DEFINITIONS.map((definition, index) => ({
    key: definition.key,
    name: definition.name,
    // Precio pendiente de configuración. No se asume gratuito.
    priceCents: null,
    maxQuantity: MAX_ADDON_QUANTITY_PER_ADDON,
    imageUrl: '',
    groupKey: PIZZA_ADDON_GROUP_KEY,
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

  if (!Number.isInteger(priceCents) || priceCents < 0) {
    throw new Error(
      `${label}: priceCents debe ser un entero mayor o igual a 0, o null.`
    );
  }
}

async function validateWithModel(Model, document, label) {
  const instance = new Model(document);

  try {
    await instance.validate();
  } catch (error) {
    const details = Object.values(error.errors || {})
      .map((item) => item.message)
      .join('; ');

    throw new Error(
      `${label}: ${details || error.message || 'documento inválido.'}`
    );
  }
}

function validateMixConfiguration() {
  const normalFlavorKeys = new Set(
    CATALOG.products
      .filter((product) => product.kind === 'pizza' && !product.isMix)
      .map((product) => product.key)
  );

  for (const product of CATALOG.products) {
    if (!product.isMix) {
      continue;
    }

    const mixConfig = product.mixConfig;

    if (
      !mixConfig ||
      mixConfig.flavorCount !== 2 ||
      mixConfig.distinctFlavors !== true
    ) {
      throw new Error(
        `Producto "${product.key}": la configuración de mixta debe exigir exactamente dos sabores diferentes.`
      );
    }

    if (
      mixConfig.allowedFlavorKeys !== null &&
      !Array.isArray(mixConfig.allowedFlavorKeys)
    ) {
      throw new Error(
        `Producto "${product.key}": allowedFlavorKeys debe ser null o una lista.`
      );
    }

    if (Array.isArray(mixConfig.allowedFlavorKeys)) {
      const seen = new Set();

      for (const flavorKey of mixConfig.allowedFlavorKeys) {
        if (flavorKey === product.key) {
          throw new Error(
            `Producto "${product.key}": una mixta no puede seleccionarse a sí misma como sabor.`
          );
        }

        if (!normalFlavorKeys.has(flavorKey)) {
          throw new Error(
            `Producto "${product.key}": el sabor "${flavorKey}" no es un sabor normal disponible.`
          );
        }

        if (seen.has(flavorKey)) {
          throw new Error(
            `Producto "${product.key}": sabor duplicado "${flavorKey}".`
          );
        }

        seen.add(flavorKey);
      }
    }
  }
}

async function validateCatalog() {
  assertUniqueKeys(CATALOG.sections, 'Secciones');
  assertUniqueKeys(CATALOG.products, 'Productos');
  assertUniqueKeys(CATALOG.addons, 'Adicionales');

  for (const section of CATALOG.sections) {
    await validateWithModel(
      MenuSection,
      section,
      `Sección "${section.key}"`
    );
  }

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

    await validateWithModel(Product, product, `Producto "${product.key}"`);
  }

  for (const addon of CATALOG.addons) {
    assertValidPrice(addon.priceCents, `Adicional "${addon.key}"`);

    if (addon.maxQuantity !== MAX_ADDON_QUANTITY_PER_ADDON) {
      throw new Error(
        `Adicional "${addon.key}": maxQuantity debe ser ${MAX_ADDON_QUANTITY_PER_ADDON}.`
      );
    }

    await validateWithModel(Addon, addon, `Adicional "${addon.key}"`);
  }

  validateMixConfiguration();
}

function printSummary() {
  console.log('Seed del catálogo preparado (Fase 2)');
  console.log('------------------------------------');
  console.log(`Secciones: ${CATALOG.sections.length}`);
  console.log(`Productos: ${CATALOG.products.length}`);
  console.log(`Adicionales: ${CATALOG.addons.length}`);
  console.log('\nSecciones:');
  CATALOG.sections.forEach((section) => {
    console.log(`- ${section.key} (${section.name})`);
  });
  console.log('\nProductos:');
  CATALOG.products.forEach((product) => {
    const mixLabel = product.isMix ? ' [mixta, allowedFlavorKeys=null]' : '';
    console.log(`- ${product.key} (${product.name})${mixLabel}`);
  });
  console.log(
    `\nAdicionales (todos con precio pendiente, máximo ${MAX_ADDON_QUANTITY_PER_ADDON} por adicional):`
  );
  CATALOG.addons.forEach((addon) => {
    console.log(`- ${addon.key} (${addon.name})`);
  });
  console.log(
    '\nModo dry-run: no se conectó a MongoDB y no se escribió nada.'
  );
  console.log(
    'Para aplicar los cambios se requiere autorización explícita: npm run db:seed -- --apply'
  );
  console.log(
    'El seed no elimina documentos antiguos ni modifica documentos sin key.'
  );
}

async function upsertDocuments(Model, documents) {
  let created = 0;
  let updated = 0;

  for (const document of documents) {
    const existing = await Model.findOne({ key: document.key }).lean();

    if (existing && existing.schemaVersion !== 1) {
      throw new Error(
        `La key "${document.key}" ya existe en un documento que no pertenece al catálogo nuevo. No se sobrescribe.`
      );
    }

    await Model.findOneAndUpdate(
      { key: document.key },
      { $set: document },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  return {
    collection: Model.collection.name,
    created,
    updated,
  };
}

async function applyCatalog() {
  const mongoose = require('mongoose');
  const env = require('../src/config/env');

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const results = [];

  results.push(await upsertDocuments(MenuSection, CATALOG.sections));
  results.push(await upsertDocuments(Product, CATALOG.products));
  results.push(await upsertDocuments(Addon, CATALOG.addons));

  console.log('Seed aplicado');
  console.log('-------------');
  results.forEach((result) => {
    console.log(
      `- ${result.collection}: creados=${result.created}, actualizados=${result.updated}`
    );
  });
  console.log('No se eliminó ningún documento.');
}

function safeErrorMessage(error) {
  const rawMessage = String(error.message || error);
  const mongoUri = process.env.MONGODB_URI;

  return mongoUri
    ? rawMessage.replaceAll(mongoUri, '[MONGODB_URI oculto]')
    : rawMessage;
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

  await validateCatalog();
  printSummary();

  if (!apply) {
    return;
  }

  await applyCatalog();
}

main()
  .catch((error) => {
    console.error(`\nError durante el seed: ${safeErrorMessage(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = require('mongoose');
    await mongoose.connection.close();
  });
