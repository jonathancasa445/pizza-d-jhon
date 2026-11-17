const test = require('node:test');
const assert = require('node:assert/strict');

const Product = require('../src/models/Product');
const {
  buildMenuResponse,
  getStartingPriceCents,
  isValidProductKey,
  productBelongsToSection,
  serializeAddon,
  serializeProduct,
} = require('../src/services/menuService');

const sections = [
  {
    key: 'pizzas-familiares',
    name: 'Pizzas familiares',
    order: 1,
    active: true,
    kind: 'pizza-presentation',
    presentationKey: 'familiar',
  },
  {
    key: 'pizzas-medianas',
    name: 'Pizzas medianas',
    order: 2,
    active: true,
    kind: 'pizza-presentation',
    presentationKey: 'mediana',
  },
  {
    key: 'pizzas-de-borde',
    name: 'Pizzas de borde',
    order: 3,
    active: true,
    kind: 'pizza-presentation',
    presentationKey: 'borde',
  },
  {
    key: 'alitas',
    name: 'Alitas',
    order: 4,
    active: true,
    kind: 'standard',
    presentationKey: null,
  },
  {
    key: 'acompanantes',
    name: 'Acompañantes',
    order: 5,
    active: true,
    kind: 'standard',
    presentationKey: null,
  },
  {
    key: 'bebidas',
    name: 'Bebidas',
    order: 6,
    active: true,
    kind: 'standard',
    presentationKey: null,
  },
  {
    key: 'seccion-inactiva',
    name: 'Sección inactiva',
    order: 7,
    active: false,
    kind: 'standard',
    presentationKey: null,
  },
];

const presentationVariants = [
  { key: 'familiar', name: 'Familiar', priceCents: 1000, order: 1 },
  { key: 'mediana', name: 'Mediana', priceCents: 500, order: 2 },
  { key: 'borde', name: 'De borde', priceCents: 1200, order: 3 },
];

const pizzaNames = [
  ['pizza-jamon', 'Jamón'],
  ['pizza-pepperoni', 'Pepperoni'],
  ['pizza-hawaiana', 'Hawaiana'],
  ['pizza-amante-a-la-carne', 'Amante a la carne'],
  ['pizza-suprema', 'Suprema'],
  ['pizza-continental', 'Continental'],
  ['pizza-mixta', 'Mixta'],
];

const pizzas = pizzaNames.map(([key, name], index) => ({
  key,
  name,
  description: '',
  ingredients: [],
  imageUrl: '',
  kind: 'pizza',
  categoryKey: null,
  variants: presentationVariants.map((variant) => ({ ...variant })),
  optionGroups: [],
  addonGroupKeys: ['pizza-extras'],
  isMix: key === 'pizza-mixta',
  mixConfig:
    key === 'pizza-mixta'
      ? {
          flavorCount: 2,
          distinctFlavors: true,
          allowedFlavorKeys: null,
        }
      : null,
  available: true,
  order: index + 1,
  schemaVersion: 1,
  legacy: false,
}));

const incompletePizza = {
  key: 'pizza-incompleta',
  name: 'Incompleta',
  description: '',
  kind: 'pizza',
  variants: [
    { key: 'familiar', name: 'Familiar', priceCents: null, order: 1 },
    { key: 'mediana', name: 'Mediana', priceCents: 900, order: 2 },
    { key: 'borde', name: 'De borde', priceCents: null, order: 3 },
  ],
  addonGroupKeys: ['pizza-extras'],
  available: true,
  order: 8,
  schemaVersion: 1,
  legacy: false,
};

const unpricedPizza = {
  key: 'pizza-sin-precio',
  name: 'Sin precio',
  description: '',
  kind: 'pizza',
  variants: presentationVariants.map((variant) => ({
    ...variant,
    priceCents: null,
  })),
  addonGroupKeys: ['pizza-extras'],
  available: true,
  order: 9,
  schemaVersion: 1,
  legacy: false,
};

const legacyPizza = {
  key: 'pizza-legacy',
  name: 'Legacy',
  description: '',
  kind: 'pizza',
  variants: presentationVariants.map((variant) => ({ ...variant })),
  available: true,
  order: 10,
  schemaVersion: 0,
  legacy: true,
};

const unavailablePizza = {
  key: 'pizza-no-disponible',
  name: 'No disponible',
  description: '',
  kind: 'pizza',
  variants: presentationVariants.map((variant) => ({ ...variant })),
  available: false,
  order: 11,
  schemaVersion: 1,
  legacy: false,
};

const simpleProducts = [
  {
    key: 'alitas-bbq',
    name: 'Alitas BBQ',
    kind: 'simple',
    categoryKey: 'alitas',
    variants: [{ key: 'unidad', name: 'Unidad', priceCents: 700, order: 1 }],
    available: true,
    order: 20,
    schemaVersion: 1,
    legacy: false,
  },
  {
    key: 'papas-fritas',
    name: 'Papas fritas',
    kind: 'simple',
    categoryKey: 'acompanantes',
    variants: [{ key: 'unidad', name: 'Unidad', priceCents: 300, order: 1 }],
    available: true,
    order: 21,
    schemaVersion: 1,
    legacy: false,
  },
  {
    key: 'refresco',
    name: 'Refresco',
    kind: 'simple',
    categoryKey: 'bebidas',
    variants: [{ key: 'unidad', name: 'Unidad', priceCents: 200, order: 1 }],
    available: true,
    order: 22,
    schemaVersion: 1,
    legacy: false,
  },
  {
    key: 'producto-sin-precio',
    name: 'Producto sin precio',
    kind: 'simple',
    categoryKey: 'bebidas',
    variants: [{ key: 'unidad', name: 'Unidad', priceCents: null, order: 1 }],
    available: true,
    order: 23,
    schemaVersion: 1,
    legacy: false,
  },
];

const products = [
  ...pizzas,
  incompletePizza,
  unpricedPizza,
  legacyPizza,
  unavailablePizza,
  ...simpleProducts,
];

const addonNames = [
  ['queso-extra', 'Queso extra', 150],
  ['jamon-extra', 'Jamón extra', 200],
  ['pepperoni-extra', 'Pepperoni extra', 250],
  ['pina', 'Piña', null],
  ['tocino', 'Tocino', 300],
  ['chorizo', 'Chorizo', 250],
  ['mix-de-vegetales', 'Mix de vegetales', 180],
  ['champinon', 'Champiñón', 220],
  ['salami', 'Salami', 240],
];

const addons = addonNames.map(([key, name, priceCents], index) => ({
  key,
  name,
  priceCents,
  maxQuantity: 3,
  groupKey: 'pizza-extras',
  appliesToKinds: ['pizza'],
  available: true,
  order: index + 1,
}));

test('buildMenuResponse agrupa secciones y calcula precios desde', () => {
  const menu = buildMenuResponse({ sections, products, addons });
  const sectionsByKey = new Map(
    menu.sections.map((section) => [section.key, section])
  );

  assert.equal(menu.sections.length, 6);
  assert.equal(menu.products.length, 11);
  assert.equal(menu.addons.length, 9);
  assert.deepEqual(menu.limits, {
    maxQuantityPerAddon: 3,
    maxAddonUnitsPerPizza: 10,
  });

  assert.deepEqual(
    sectionsByKey.get('pizzas-familiares').productKeys,
    pizzas.map((product) => product.key)
  );
  assert.equal(
    sectionsByKey.get('pizzas-familiares').startingPriceCents,
    1000
  );
  assert.equal(sectionsByKey.get('pizzas-medianas').startingPriceCents, 500);
  assert.equal(sectionsByKey.get('pizzas-de-borde').startingPriceCents, 1200);

  assert.deepEqual(sectionsByKey.get('alitas').productKeys, ['alitas-bbq']);
  assert.equal(sectionsByKey.get('alitas').startingPriceCents, 700);
  assert.deepEqual(sectionsByKey.get('acompanantes').productKeys, [
    'papas-fritas',
  ]);
  assert.equal(sectionsByKey.get('acompanantes').startingPriceCents, 300);
  assert.deepEqual(sectionsByKey.get('bebidas').productKeys, ['refresco']);
  assert.equal(sectionsByKey.get('bebidas').startingPriceCents, 200);

  assert.equal(sectionsByKey.has('seccion-inactiva'), false);
});

test('buildMenuResponse excluye productos legacy, no disponibles y sin precio', () => {
  const menu = buildMenuResponse({ sections, products, addons });
  const productKeys = menu.products.map((product) => product.key);

  assert.equal(productKeys.includes('pizza-sin-precio'), false);
  assert.equal(productKeys.includes('pizza-legacy'), false);
  assert.equal(productKeys.includes('pizza-no-disponible'), false);
  assert.equal(productKeys.includes('producto-sin-precio'), false);
});

test('una pizza con una presentación sin precio solo aparece donde tiene precio', () => {
  const menu = buildMenuResponse({ sections, products, addons });
  const sectionsByKey = new Map(
    menu.sections.map((section) => [section.key, section])
  );

  assert.equal(
    sectionsByKey.get('pizzas-familiares').productKeys.includes(
      'pizza-incompleta'
    ),
    false
  );
  assert.equal(
    sectionsByKey.get('pizzas-medianas').productKeys.includes(
      'pizza-incompleta'
    ),
    true
  );
  assert.equal(
    sectionsByKey.get('pizzas-de-borde').productKeys.includes(
      'pizza-incompleta'
    ),
    false
  );
});

test('la mixta conserva allowedFlavorKeys null y exige dos sabores', () => {
  const menu = buildMenuResponse({ sections, products, addons });
  const mixta = menu.products.find(
    (product) => product.key === 'pizza-mixta'
  );

  assert.equal(mixta.isMix, true);
  assert.equal(mixta.mixConfig.flavorCount, 2);
  assert.equal(mixta.mixConfig.distinctFlavors, true);
  assert.equal(mixta.mixConfig.allowedFlavorKeys, null);
});

test('el modelo Product conserva allowedFlavorKeys null al validar', async () => {
  const product = new Product({
    key: 'pizza-mixta',
    name: 'Mixta',
    kind: 'pizza',
    isMix: true,
    mixConfig: {
      flavorCount: 2,
      distinctFlavors: true,
      allowedFlavorKeys: null,
    },
    variants: [
      { key: 'familiar', name: 'Familiar', priceCents: 1000 },
      { key: 'mediana', name: 'Mediana', priceCents: 500 },
    ],
  });

  await product.validate();

  assert.equal(product.mixConfig.allowedFlavorKeys, null);
});

test('los adicionales con precio null se exponen como Precio por definir', () => {
  const menu = buildMenuResponse({ sections, products, addons });
  const pina = menu.addons.find((addon) => addon.key === 'pina');

  assert.equal(pina.priceCents, null);
  assert.equal(pina.purchasable, false);
  assert.equal(pina.maxQuantity, 3);
  assert.equal(
    menu.addons.every((addon) => addon.maxQuantity === 3),
    true
  );
});

test('un adicional disponible con precio entero válido es purchasable', () => {
  const menu = buildMenuResponse({ sections, products, addons });
  const queso = menu.addons.find((addon) => addon.key === 'queso-extra');

  assert.equal(queso.priceCents, 150);
  assert.equal(queso.available, true);
  assert.equal(queso.purchasable, true);
});

test('un adicional disponible con precio 0 es purchasable', () => {
  const addon = serializeAddon({
    key: 'adicional-gratis',
    name: 'Adicional gratis',
    priceCents: 0,
    available: true,
  });

  assert.equal(addon.priceCents, 0);
  assert.equal(addon.purchasable, true);
});

test('un adicional no disponible no es purchasable aunque tenga precio', () => {
  const addon = serializeAddon({
    key: 'queso-extra',
    name: 'Queso extra',
    priceCents: 150,
    available: false,
  });

  assert.equal(addon.available, false);
  assert.equal(addon.purchasable, false);
});

test('serializeProduct no expone campos internos ni legacy', () => {
  const serialized = serializeProduct(pizzas[0]);

  assert.equal(serialized.key, 'pizza-jamon');
  assert.equal(serialized.price, undefined);
  assert.equal(serialized.category, undefined);
  assert.equal(serialized.schemaVersion, undefined);
  assert.equal(serialized.legacy, undefined);
  assert.equal(serialized.variants.length, 3);
});

test('getStartingPriceCents devuelve null cuando no hay variantes con precio', () => {
  assert.equal(
    getStartingPriceCents([unpricedPizza], sections[0]),
    null
  );
});

test('productBelongsToSection respeta presentación y categoría', () => {
  const familiar = sections[0];
  const mediana = sections[1];
  const alitas = sections[3];

  assert.equal(productBelongsToSection(pizzas[0], familiar), true);
  assert.equal(productBelongsToSection(pizzas[0], mediana), true);
  assert.equal(productBelongsToSection(simpleProducts[0], alitas), true);
  assert.equal(productBelongsToSection(pizzas[0], alitas), false);
});

test('isValidProductKey valida el formato de las claves', () => {
  assert.equal(isValidProductKey('pizza-jamon'), true);
  assert.equal(isValidProductKey('pizzas-familiares'), true);
  assert.equal(isValidProductKey('pizza-mixta'), true);
  assert.equal(isValidProductKey('Pizza Jamón'), false);
  assert.equal(isValidProductKey('pizza_jamon'), false);
  assert.equal(isValidProductKey('pizza*jamon'), false);
  assert.equal(isValidProductKey('pizzas*familiares'), false);
  assert.equal(isValidProductKey('pizza-jamon!'), false);
  assert.equal(isValidProductKey(''), false);
  assert.equal(isValidProductKey(null), false);
});
