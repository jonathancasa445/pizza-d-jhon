#!/usr/bin/env node

/**
 * Inserta exclusivamente los 10 productos simples del catálogo ampliado.
 *
 * Seguridad:
 * - Dry-run por defecto; solo `--apply` escribe en MongoDB.
 * - Verifica que ninguna clave exista antes de insertar.
 * - Usa $setOnInsert: un documento existente nunca se modifica.
 * - No toca MenuSection, Admin, Order, índices, pizzas ni productos anteriores.
 * - Nunca imprime credenciales ni valores sensibles.
 *
 *   node scripts/seed-simple-products.js            # validación, sin escribir
 *   node scripts/seed-simple-products.js --apply    # inserción protegida
 */

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const env = require('../src/config/env');
const Product = require('../src/models/Product');

const FRONTEND_PUBLIC_DIR = path.resolve(__dirname, '../../frontend/public');
const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_CATEGORIES = new Set(['alitas', 'acompanantes', 'bebidas']);

function variant(key, name, priceCents, order = 0) {
  return { key, name, priceCents, available: true, order };
}

function simpleProduct({
  key,
  name,
  description,
  categoryKey,
  variantLabel = 'Presentación',
  imageUrl,
  variants,
  order,
}) {
  return {
    key,
    name,
    description,
    ingredients: [],
    imageUrl,
    kind: 'simple',
    categoryKey,
    variantLabel,
    variants,
    optionGroups: [],
    addonGroupKeys: [],
    isMix: false,
    mixConfig: null,
    available: true,
    order,
    schemaVersion: 1,
    legacy: false,
  };
}

const SIMPLE_PRODUCTS = [
  simpleProduct({
    key: 'alitas-bbq',
    name: 'Alitas BBQ',
    description: 'Alitas bañadas en salsa BBQ. 6 unidades.',
    categoryKey: 'alitas',
    imageUrl: '/images/menu/alitas/alitas-bbq.jpg',
    variants: [variant('seis-unidades', '6 unidades', 400)],
    order: 8,
  }),
  simpleProduct({
    key: 'alitas-honey-mustard',
    name: 'Alitas Honey Mustard',
    description: 'Alitas con salsa honey mustard. 6 unidades.',
    categoryKey: 'alitas',
    imageUrl: '/images/menu/alitas/alitas-honeymustard.jpg',
    variants: [variant('seis-unidades', '6 unidades', 400)],
    order: 9,
  }),
  simpleProduct({
    key: 'pan-de-ajo-supremo',
    name: 'Pan de ajo supremo',
    description: 'Pan de ajo supreme. 6 unidades.',
    categoryKey: 'acompanantes',
    imageUrl: '/images/menu/acompañantes/pan-de-ajo-supremo.jpg',
    variants: [variant('seis-unidades', '6 unidades', 250)],
    order: 10,
  }),
  simpleProduct({
    key: 'cinnamon-stick',
    name: 'Cinnamon Stick',
    description: 'Bastón de canela con azúcar.',
    categoryKey: 'acompanantes',
    imageUrl: '/images/menu/acompañantes/cinnamon-stick.jpg',
    variants: [variant('unidad', 'Unidad', 250)],
    order: 11,
  }),
  simpleProduct({
    key: 'bread-stick',
    name: 'Bread Stick',
    description: 'Bastón de pan con queso.',
    categoryKey: 'acompanantes',
    imageUrl: '/images/menu/acompañantes/bread-stick.jpg',
    variants: [variant('unidad', 'Unidad', 250)],
    order: 12,
  }),
  simpleProduct({
    key: 'papas-supremas',
    name: 'Papas supremas',
    description: 'Porción de papas supremas.',
    categoryKey: 'acompanantes',
    imageUrl: '/images/menu/acompañantes/papas-supremas.jpg',
    variants: [variant('unidad', 'Unidad', 300)],
    order: 13,
  }),
  simpleProduct({
    key: 'nuggets-salsa-bbq',
    name: 'Nuggets con salsa BBQ',
    description: 'Nuggets con salsa BBQ. 6 unidades.',
    categoryKey: 'acompanantes',
    imageUrl: '/images/menu/acompañantes/nuggets.jpg',
    variants: [variant('seis-unidades', '6 unidades', 200)],
    order: 14,
  }),
  simpleProduct({
    key: 'nachos-salsa-queso',
    name: 'Nachos con salsa de queso',
    description: 'Nachos con salsa de queso.',
    categoryKey: 'acompanantes',
    imageUrl: '/images/menu/acompañantes/nachos.jpg',
    variants: [variant('unidad', 'Unidad', 200)],
    order: 15,
  }),
  simpleProduct({
    key: 'bebida-coca-cola-1350',
    name: 'Coca-Cola 1,35 L',
    description: 'Bebida de 1,35 litros. Elige tu sabor.',
    categoryKey: 'bebidas',
    variantLabel: 'Sabor',
    imageUrl: '/images/menu/bebidas/colas-cocacola-1l.jpg',
    variants: [
      variant('coca-cola', 'Coca-Cola', 150),
      variant('sprite', 'Sprite', 150, 1),
      variant('fiora-vanti', 'Fiora Vanti', 150, 2),
      variant('fanta', 'Fanta', 150, 3),
    ],
    order: 16,
  }),
  simpleProduct({
    key: 'bebida-pepsi-1000',
    name: 'Pepsi 1 L',
    description: 'Bebida de 1 litro. Elige tu sabor.',
    categoryKey: 'bebidas',
    variantLabel: 'Sabor',
    imageUrl: '/images/menu/bebidas/colas-pepsi.jpg',
    variants: [
      variant('pepsi', 'Pepsi', 100),
      variant('seven', 'Seven', 100, 1),
      variant('gallito', 'Gallito', 100, 2),
      variant('tropical', 'Tropical', 100, 3),
    ],
    order: 17,
  }),
];

function validateDefinitions() {
  if (SIMPLE_PRODUCTS.length !== 10) {
    throw new Error('El catálogo debe contener exactamente 10 productos.');
  }

  const productKeys = new Set();

  for (const product of SIMPLE_PRODUCTS) {
    if (!KEY_PATTERN.test(product.key)) {
      throw new Error(`Clave de producto inválida: ${product.key}`);
    }

    if (productKeys.has(product.key)) {
      throw new Error(`Clave de producto duplicada: ${product.key}`);
    }
    productKeys.add(product.key);

    if (!VALID_CATEGORIES.has(product.categoryKey)) {
      throw new Error(
        `Categoría inválida en ${product.key}: ${product.categoryKey}`
      );
    }

    if (product.kind !== 'simple' || product.schemaVersion !== 1) {
      throw new Error(`Producto simple inválido: ${product.key}`);
    }

    if (product.available !== true || product.legacy !== false) {
      throw new Error(`Disponibilidad inválida en ${product.key}`);
    }

    if (!Array.isArray(product.variants) || product.variants.length === 0) {
      throw new Error(`Sin variantes en ${product.key}`);
    }

    const isDrink = product.categoryKey === 'bebidas';
    if (isDrink && product.variants.length !== 4) {
      throw new Error(`Las bebidas deben tener 4 sabores: ${product.key}`);
    }
    if (!isDrink && product.variants.length !== 1) {
      throw new Error(`Los productos no bebida deben tener 1 variante: ${product.key}`);
    }

    const variantKeys = new Set();

    for (const item of product.variants) {
      if (!KEY_PATTERN.test(item.key)) {
        throw new Error(`Clave de variante inválida en ${product.key}: ${item.key}`);
      }

      if (variantKeys.has(item.key)) {
        throw new Error(`Variante duplicada en ${product.key}: ${item.key}`);
      }
      variantKeys.add(item.key);

      if (!Number.isInteger(item.priceCents) || item.priceCents < 0) {
        throw new Error(`Precio inválido en ${product.key}/${item.key}`);
      }

      if (item.available !== true) {
        throw new Error(`Variante no disponible en ${product.key}/${item.key}`);
      }
    }

    if (
      typeof product.imageUrl !== 'string' ||
      !product.imageUrl.startsWith('/images/menu/')
    ) {
      throw new Error(`Ruta de imagen inválida en ${product.key}`);
    }
  }

  const expectedPrices = new Map([
    ['alitas-bbq', 400],
    ['alitas-honey-mustard', 400],
    ['pan-de-ajo-supremo', 250],
    ['cinnamon-stick', 250],
    ['bread-stick', 250],
    ['papas-supremas', 300],
    ['nuggets-salsa-bbq', 200],
    ['nachos-salsa-queso', 200],
    ['bebida-coca-cola-1350', 150],
    ['bebida-pepsi-1000', 100],
  ]);

  for (const product of SIMPLE_PRODUCTS) {
    const expected = expectedPrices.get(product.key);

    if (product.variants.some((item) => item.priceCents !== expected)) {
      throw new Error(`Precio incorrecto en ${product.key}`);
    }
  }
}

function assertImagesExist() {
  for (const product of SIMPLE_PRODUCTS) {
    const absolutePath = path.resolve(
      FRONTEND_PUBLIC_DIR,
      product.imageUrl.slice(1)
    );

    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      throw new Error(`No existe la imagen de ${product.key}: ${product.imageUrl}`);
    }
  }
}

function printPreview() {
  console.log('Vista previa (dry-run, sin escritura)');
  console.log('------------------------------------');

  for (const product of SIMPLE_PRODUCTS) {
    const prices = product.variants
      .map((item) => `${item.key}=${item.priceCents}`)
      .join(', ');
    console.log(`${product.key} | ${product.categoryKey} | ${prices} | ${product.imageUrl}`);
  }
}

async function validateDocumentsWithModel() {
  for (const document of SIMPLE_PRODUCTS) {
    const instance = new Product(document);
    await instance.validate();
  }
}

async function main() {
  validateDefinitions();
  assertImagesExist();
  await validateDocumentsWithModel();

  if (!process.argv.includes('--apply')) {
    printPreview();
    console.log('\nDry-run completado. No se escribió en MongoDB.');
    return;
  }

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const keys = SIMPLE_PRODUCTS.map((product) => product.key);
  const occupied = await Product.find({ key: { $in: keys } })
    .select('key')
    .lean();

  if (occupied.length > 0) {
    const occupiedKeys = occupied.map((doc) => doc.key).sort().join(', ');
    throw new Error(
      `Existen claves ocupadas; no se insertó nada: ${occupiedKeys}`
    );
  }

  for (const document of SIMPLE_PRODUCTS) {
    const result = await Product.updateOne(
      { key: document.key },
      { $setOnInsert: document },
      {
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    if (result.upsertedCount !== 1) {
      throw new Error(
        `No se pudo insertar "${document.key}" de forma segura; se detiene el script.`
      );
    }

    console.log(`Insertado: ${document.key}`);
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      const safeMessage = String(error.message || error).replaceAll(
        env.MONGODB_URI,
        '[MONGODB_URI oculto]'
      );
      console.error(`Error: ${safeMessage}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.connection.close();
    });
}

module.exports = {
  SIMPLE_PRODUCTS,
  validateDefinitions,
  assertImagesExist,
  validateDocumentsWithModel,
};
