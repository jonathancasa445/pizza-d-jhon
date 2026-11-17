const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  ADDON_PRICE_CENTS,
  CATALOG,
  validateCatalog,
} = require('../scripts/seed-catalog');
const { MAX_ADDON_UNITS_PER_PIZZA } = require('../src/constants/catalog');

const FRONTEND_PUBLIC_DIR = path.resolve(__dirname, '../../frontend/public');

const expectedProducts = [
  {
    key: 'pizza-jamon',
    name: 'Amantes al Jamón',
    imageUrl: '/images/menu/pizzas/amantes-al-jamon.jpg',
    ingredients: [
      'Salsa pizza',
      'Queso mozzarella',
      'Mucho jamón',
      'Extra queso',
    ],
    description:
      'Para quienes disfrutan del jamón en cada bocado. Una deliciosa combinación de salsa de pizza, mozzarella, abundante jamón y extra queso.',
  },
  {
    key: 'pizza-pepperoni',
    name: 'Amantes al Pepperoni',
    imageUrl: '/images/menu/pizzas/amantes-al-pepperoni.jpg',
    ingredients: [
      'Salsa pizza',
      'Queso mozzarella',
      'Mucho pepperoni',
      'Extra queso',
    ],
    description:
      'Una pizza irresistible para los amantes del pepperoni, con salsa de pizza, mozzarella, abundante pepperoni y extra queso.',
  },
  {
    key: 'pizza-continental',
    name: 'Continental',
    imageUrl: '/images/menu/pizzas/continental.jpg',
    ingredients: [
      'Salsa pizza',
      'Queso mozzarella',
      'Jamón',
      'Chorizo',
      'Pimiento',
      'Champiñón',
    ],
    description:
      'Una combinación llena de sabor que reúne jamón, chorizo, pimiento y champiñones sobre una base de salsa de pizza y queso mozzarella.',
  },
  {
    key: 'pizza-hawaiana',
    name: 'Hawaiana',
    imageUrl: '/images/menu/pizzas/hawaiana.jpg',
    ingredients: [
      'Salsa pizza',
      'Queso mozzarella',
      'Jamón',
      'Piña',
      'Extra jamón',
    ],
    description:
      'La combinación perfecta entre lo dulce y lo salado. Deliciosa mezcla de jamón, piña y extra jamón, acompañada de salsa de pizza y mozzarella.',
  },
  {
    key: 'pizza-amante-a-la-carne',
    name: 'Amantes a la Carne',
    imageUrl: '/images/menu/pizzas/amantes-a-la-carne.jpg',
    ingredients: [
      'Salsa pizza',
      'Queso mozzarella',
      'Jamón',
      'Pepperoni',
      'Salami',
      'Tocino',
    ],
    description:
      'Una opción cargada de sabor para los amantes de las carnes: jamón, pepperoni, salami y tocino, sobre salsa de pizza y queso mozzarella.',
  },
  {
    key: 'pizza-suprema',
    name: 'Super Suprema',
    imageUrl: '/images/menu/pizzas/super-suprema.jpg',
    ingredients: [
      'Salsa pizza',
      'Queso mozzarella',
      'Jamón',
      'Pepperoni',
      'Chorizo',
      'Mix de vegetales (pimiento, cebolla y champiñón)',
    ],
    description:
      'Una combinación completa de sabores con jamón, pepperoni, chorizo y mix de vegetales (pimiento, cebolla y champiñón), sobre salsa de pizza y mozzarella.',
  },
  {
    key: 'pizza-mixta',
    name: 'Mixta',
    imageUrl: '/images/menu/pizzas/mixta.jpg',
    ingredients: [],
    description:
      '¡Dos sabores en una sola pizza! Escoge tus dos favoritos y disfruta de una mitad de cada sabor, para compartir y disfrutar de lo mejor de ambos.',
  },
];

test('el seed contiene 6 secciones, 7 pizzas y 9 adicionales', () => {
  assert.equal(CATALOG.sections.length, 6);
  assert.equal(CATALOG.products.length, 7);
  assert.equal(CATALOG.addons.length, 9);
  assert.deepEqual(
    CATALOG.sections.map((section) => section.key),
    [
      'pizzas-familiares',
      'pizzas-medianas',
      'pizzas-de-borde',
      'alitas',
      'acompanantes',
      'bebidas',
    ]
  );
});

test('las pizzas conservan sus claves y usan los nombres e imágenes aprobados', () => {
  const productsByKey = new Map(
    CATALOG.products.map((product) => [product.key, product])
  );

  for (const expected of expectedProducts) {
    const product = productsByKey.get(expected.key);

    assert.ok(product, `No se encontró la pizza ${expected.key}`);
    assert.equal(product.name, expected.name);
    assert.equal(product.imageUrl, expected.imageUrl);
  }

  assert.deepEqual(
    CATALOG.products.map((product) => product.key),
    expectedProducts.map((product) => product.key)
  );
});

test('las pizzas tienen los ingredientes aprobados', () => {
  const productsByKey = new Map(
    CATALOG.products.map((product) => [product.key, product])
  );

  for (const expected of expectedProducts) {
    assert.deepEqual(
      productsByKey.get(expected.key).ingredients,
      expected.ingredients
    );
  }
});

test('las pizzas tienen las descripciones aprobadas', () => {
  const productsByKey = new Map(
    CATALOG.products.map((product) => [product.key, product])
  );

  for (const expected of expectedProducts) {
    assert.equal(
      productsByKey.get(expected.key).description,
      expected.description
    );
  }
});

test('los nueve adicionales cuestan USD 1.00 y respetan los límites', () => {
  assert.equal(ADDON_PRICE_CENTS, 100);
  assert.equal(MAX_ADDON_UNITS_PER_PIZZA, 10);
  assert.deepEqual(
    CATALOG.addons.map((addon) => addon.key),
    [
      'queso-extra',
      'jamon-extra',
      'pepperoni-extra',
      'pina',
      'tocino',
      'chorizo',
      'mix-de-vegetales',
      'champinon',
      'salami',
    ]
  );

  for (const addon of CATALOG.addons) {
    assert.equal(addon.priceCents, 100);
    assert.equal(addon.maxQuantity, 3);
    assert.equal(addon.available, true);
    assert.deepEqual(addon.appliesToKinds, ['pizza']);
  }
});

test('las presentaciones y la pizza mixta conservan las reglas aprobadas', () => {
  for (const product of CATALOG.products) {
    const variants = new Map(
      product.variants.map((variant) => [variant.key, variant.priceCents])
    );

    assert.equal(variants.get('familiar'), 1000);
    assert.equal(variants.get('mediana'), 500);
    assert.equal(variants.get('borde'), 1200);
    assert.deepEqual(product.addonGroupKeys, ['pizza-extras']);
    assert.deepEqual(product.optionGroups, []);
  }

  const mixta = CATALOG.products.find(
    (product) => product.key === 'pizza-mixta'
  );

  assert.equal(mixta.isMix, true);
  assert.equal(mixta.mixConfig.flavorCount, 2);
  assert.equal(mixta.mixConfig.distinctFlavors, true);
  assert.equal(mixta.mixConfig.allowedFlavorKeys, null);
  assert.deepEqual(mixta.ingredients, []);
});

test('las siete rutas de imágenes corresponden a archivos JPG existentes', () => {
  for (const product of CATALOG.products) {
    assert.match(
      product.imageUrl,
      /^\/images\/menu\/pizzas\/[a-z0-9-]+\.jpg$/
    );

    const absolutePath = path.resolve(
      FRONTEND_PUBLIC_DIR,
      product.imageUrl.slice(1)
    );

    assert.equal(
      fs.existsSync(absolutePath),
      true,
      `No existe la imagen ${product.imageUrl}`
    );
    assert.equal(fs.statSync(absolutePath).isFile(), true);
  }
});

test('el catálogo del seed pasa la validación de modelos e imágenes', async () => {
  await validateCatalog();
});
