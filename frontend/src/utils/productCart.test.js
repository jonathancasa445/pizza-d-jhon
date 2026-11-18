import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCartItem,
  getMixFlavorOptions,
  getPresentationVariant,
  getSelectableVariants,
  resolveConfiguredVariant,
} from './pizzaConfig.js';
import { buildOrderRequest } from './orderPayload.js';
import { getCartCount, getCartTotalCents } from './cart.js';

const simpleProduct = {
  key: 'alitas-bbq',
  name: 'Alitas BBQ',
  kind: 'simple',
  imageUrl: '',
  addonGroupKeys: [],
  variants: [
    { key: 'porcion', name: 'Porción', priceCents: 900, available: true },
  ],
};

const pizzaProduct = {
  key: 'pizza-jamon',
  name: 'Amantes al Jamón',
  kind: 'pizza',
  imageUrl: '',
  addonGroupKeys: [],
  variants: [
    { key: 'familiar', name: 'Familiar', priceCents: 1000, available: true },
    { key: 'mediana', name: 'Mediana', priceCents: 500, available: true },
  ],
};

const drinkProduct = {
  key: 'bebida-coca-cola-1350',
  name: 'Coca-Cola 1,35 L',
  kind: 'simple',
  variantLabel: 'Sabor',
  imageUrl: '/images/menu/bebidas/colas-cocacola-1l.jpg',
  addonGroupKeys: [],
  variants: [
    { key: 'coca-cola', name: 'Coca-Cola', priceCents: 150, available: true },
    { key: 'sprite', name: 'Sprite', priceCents: 150, available: true },
    { key: 'fiora-vanti', name: 'Fiora Vanti', priceCents: 150, available: true },
    { key: 'fanta', name: 'Fanta', priceCents: 150, available: true },
  ],
};

const mixProduct = {
  key: 'pizza-mixta',
  name: 'Mixta',
  kind: 'pizza',
  isMix: true,
  mixConfig: { flavorCount: 2, distinctFlavors: true, allowedFlavorKeys: null },
  addonGroupKeys: [],
  variants: [
    { key: 'familiar', name: 'Familiar', priceCents: 1000, available: true },
  ],
};

test('un producto simple sin presentationKey usa la clave de su variante', () => {
  const variant = getPresentationVariant(simpleProduct, null);

  assert.equal(variant.key, 'porcion');

  const item = buildCartItem({
    product: simpleProduct,
    variant,
    presentationKey: null,
  });

  assert.equal(item.presentationKey, 'porcion');
  assert.equal(item.presentationName, 'Porción');
  assert.match(item.configurationKey, /^alitas-bbq::porcion::/);
});

test('una pizza conserva su presentationKey explícita', () => {
  const variant = getPresentationVariant(pizzaProduct, 'familiar');

  const item = buildCartItem({
    product: pizzaProduct,
    variant,
    presentationKey: 'familiar',
  });

  assert.equal(item.presentationKey, 'familiar');
  assert.equal(item.presentationName, 'Familiar');
  assert.match(item.configurationKey, /^pizza-jamon::familiar::/);
});

test('el checkout acepta una mezcla de pizza y producto simple', () => {
  const simpleVariant = getPresentationVariant(simpleProduct, null);
  const pizzaVariant = getPresentationVariant(pizzaProduct, 'familiar');

  const cart = [
    buildCartItem({
      product: simpleProduct,
      variant: simpleVariant,
      presentationKey: null,
    }),
    buildCartItem({
      product: pizzaProduct,
      variant: pizzaVariant,
      presentationKey: 'familiar',
    }),
  ];

  const request = buildOrderRequest(cart, {
    name: 'Ana',
    modality: 'pickup',
  });

  assert.equal(request.items.length, 2);
  assert.equal(request.items[0].presentationKey, 'porcion');
  assert.equal(request.items[1].presentationKey, 'familiar');
});

test('los totales del carrito incluyen productos simples y pizzas', () => {
  const simpleVariant = getPresentationVariant(simpleProduct, null);
  const pizzaVariant = getPresentationVariant(pizzaProduct, 'familiar');

  const simpleItem = buildCartItem({
    product: simpleProduct,
    variant: simpleVariant,
    presentationKey: null,
  });
  const pizzaItem = buildCartItem({
    product: pizzaProduct,
    variant: pizzaVariant,
    presentationKey: 'familiar',
  });

  const cart = [
    { ...simpleItem, quantity: 2 },
    { ...pizzaItem, quantity: 1 },
  ];

  assert.equal(getCartCount(cart), 3);
  assert.equal(getCartTotalCents(cart), 900 * 2 + 1000);
});

test('cada sabor de un producto simple se puede seleccionar por separado', () => {
  assert.equal(getSelectableVariants(drinkProduct).length, 4);

  const ids = new Set();

  for (const variant of drinkProduct.variants) {
    const selection = resolveConfiguredVariant({
      product: drinkProduct,
      presentationKey: null,
      selectedVariantKeys: [variant.key],
    });

    assert.equal(selection.needsSelection, true);
    assert.equal(selection.isValid, true);
    assert.equal(selection.variant.key, variant.key);

    const item = buildCartItem({
      product: drinkProduct,
      variant: selection.variant,
      presentationKey: selection.variant.key,
    });

    assert.equal(item.presentationKey, variant.key);
    assert.equal(item.presentationName, variant.name);
    assert.equal(item.unitPriceCents, 150);
    ids.add(item.id);
  }

  assert.equal(ids.size, 4);
});

test('sin seleccionar variante no hay una selección válida', () => {
  const selection = resolveConfiguredVariant({
    product: drinkProduct,
    presentationKey: null,
    selectedVariantKeys: [],
  });

  assert.equal(selection.needsSelection, true);
  assert.equal(selection.isValid, false);
  assert.equal(selection.variant, null);
});

test('dos sabores del mismo producto no se agrupan en el carrito', () => {
  const buildDrink = (key) => {
    const selection = resolveConfiguredVariant({
      product: drinkProduct,
      presentationKey: null,
      selectedVariantKeys: [key],
    });

    return buildCartItem({
      product: drinkProduct,
      variant: selection.variant,
      presentationKey: selection.variant.key,
    });
  };

  const coca = buildDrink('coca-cola');
  const sprite = buildDrink('sprite');

  assert.notEqual(coca.id, sprite.id);
  assert.notEqual(coca.configurationKey, sprite.configurationKey);

  const request = buildOrderRequest([coca, sprite], {
    name: 'Ana',
    modality: 'pickup',
  });

  assert.equal(request.items.length, 2);
  assert.equal(request.items[0].presentationKey, 'coca-cola');
  assert.equal(request.items[1].presentationKey, 'sprite');
  assert.equal(getCartTotalCents([coca, sprite]), 300);
});

test('un producto simple de una sola variante no exige selección adicional', () => {
  const selection = resolveConfiguredVariant({
    product: simpleProduct,
    presentationKey: null,
    selectedVariantKeys: [],
  });

  assert.equal(selection.needsSelection, false);
  assert.equal(selection.isValid, true);
  assert.equal(selection.variant.key, 'porcion');
});

test('la pizza mixta conserva su selección de dos sabores', () => {
  const options = getMixFlavorOptions(mixProduct, [pizzaProduct, drinkProduct]);

  assert.deepEqual(
    options.map((option) => option.key),
    ['pizza-jamon']
  );

  const selection = resolveConfiguredVariant({
    product: mixProduct,
    presentationKey: 'familiar',
    selectedVariantKeys: [],
  });

  assert.equal(selection.needsSelection, false);
  assert.equal(selection.isValid, true);

  const item = buildCartItem({
    product: mixProduct,
    variant: selection.variant,
    presentationKey: 'familiar',
    selectedFlavors: [
      { key: 'pizza-jamon', name: 'Jamón' },
      { key: 'pizza-pepperoni', name: 'Pepperoni' },
    ],
  });

  assert.equal(item.isMix, true);
  assert.equal(item.selectedFlavors.length, 2);
  assert.equal(item.presentationKey, 'familiar');
});
