const test = require('node:test');
const assert = require('node:assert/strict');

const Order = require('../src/models/Order');
const {
  createOrder,
  hashNormalizedRequest,
  OrderConflictError,
  OrderValidationError,
  validateAndPriceOrder,
  validateIdempotencyKey,
} = require('../src/services/orderService');

const VALID_KEY = '123e4567-e89b-42d3-a456-426614174000';

const menu = {
  products: [
    {
      key: 'pizza-jamon',
      name: 'Amantes al Jamón',
      kind: 'pizza',
      isMix: false,
      available: true,
      variantLabel: 'Presentación',
      variants: [
        {
          key: 'familiar',
          name: 'Familiar',
          priceCents: 1200,
          available: true,
        },
        {
          key: 'mediana',
          name: 'Mediana',
          priceCents: 900,
          available: true,
        },
      ],
      addonGroupKeys: ['pizza-extras'],
      mixConfig: null,
    },
    {
      key: 'pizza-pepperoni',
      name: 'Pepperoni',
      kind: 'pizza',
      isMix: false,
      available: true,
      variantLabel: 'Presentación',
      variants: [
        {
          key: 'familiar',
          name: 'Familiar',
          priceCents: 1300,
          available: true,
        },
      ],
      addonGroupKeys: ['pizza-extras'],
      mixConfig: null,
    },
    {
      key: 'pizza-mixta',
      name: 'Pizza Mixta',
      kind: 'pizza',
      isMix: true,
      available: true,
      variantLabel: 'Presentación',
      variants: [
        {
          key: 'familiar',
          name: 'Familiar',
          priceCents: 1400,
          available: true,
        },
      ],
      addonGroupKeys: ['pizza-extras'],
      mixConfig: {
        flavorCount: 2,
        distinctFlavors: true,
        allowedFlavorKeys: null,
      },
    },
    {
      key: 'pizza-mixta-especial',
      name: 'Pizza Mixta Especial',
      kind: 'pizza',
      isMix: true,
      available: true,
      variantLabel: 'Presentación',
      variants: [
        {
          key: 'familiar',
          name: 'Familiar',
          priceCents: 1500,
          available: true,
        },
      ],
      addonGroupKeys: ['pizza-extras'],
      mixConfig: {
        flavorCount: 2,
        distinctFlavors: true,
        allowedFlavorKeys: ['pizza-jamon', 'pizza-pepperoni'],
      },
    },
    {
      key: 'pizza-mixta-otra',
      name: 'Pizza Mixta Otra',
      kind: 'pizza',
      isMix: true,
      available: true,
      variantLabel: 'Presentación',
      variants: [
        {
          key: 'familiar',
          name: 'Familiar',
          priceCents: 1450,
          available: true,
        },
      ],
      addonGroupKeys: ['pizza-extras'],
      mixConfig: {
        flavorCount: 2,
        distinctFlavors: true,
        allowedFlavorKeys: null,
      },
    },
  ],
  addons: [
    {
      key: 'queso-extra',
      name: 'Queso extra',
      priceCents: 100,
      maxQuantity: 3,
      groupKey: 'pizza-extras',
      appliesToKinds: ['pizza'],
      available: true,
      purchasable: true,
    },
    {
      key: 'borde-queso',
      name: 'Borde de queso',
      priceCents: 200,
      maxQuantity: 3,
      groupKey: 'pizza-extras',
      appliesToKinds: ['pizza'],
      available: true,
      purchasable: true,
    },
    {
      key: 'extra-carne',
      name: 'Extra carne',
      priceCents: 300,
      maxQuantity: 1,
      groupKey: 'pizza-extras',
      appliesToKinds: ['pizza'],
      available: true,
      purchasable: true,
    },
    {
      key: 'aceitunas',
      name: 'Aceitunas',
      priceCents: 50,
      maxQuantity: 3,
      groupKey: 'pizza-extras',
      appliesToKinds: ['pizza'],
      available: true,
      purchasable: true,
    },
    {
      key: 'pina-extra',
      name: 'Piña extra',
      priceCents: 75,
      maxQuantity: 3,
      groupKey: 'pizza-extras',
      appliesToKinds: ['pizza'],
      available: true,
      purchasable: true,
    },
    {
      key: 'postre',
      name: 'Postre',
      priceCents: 100,
      maxQuantity: 3,
      groupKey: 'postres',
      appliesToKinds: ['pizza'],
      available: true,
      purchasable: true,
    },
    {
      key: 'salsa-simple',
      name: 'Salsa',
      priceCents: 50,
      maxQuantity: 3,
      groupKey: 'pizza-extras',
      appliesToKinds: ['simple'],
      available: true,
      purchasable: true,
    },
  ],
  limits: {
    maxQuantityPerAddon: 3,
    maxAddonUnitsPerPizza: 10,
  },
};

function makePayload(overrides = {}) {
  return {
    customer: { name: 'Ana Pérez' },
    modality: 'pickup',
    address: '',
    reference: '',
    observations: '',
    items: [
      {
        productKey: 'pizza-jamon',
        presentationKey: 'familiar',
        quantity: 1,
        flavors: [],
        addons: [],
      },
    ],
    ...overrides,
  };
}

function makeMixedPayload(overrides = {}) {
  return makePayload({
    items: [
      {
        productKey: 'pizza-mixta',
        presentationKey: 'familiar',
        quantity: 1,
        flavors: ['pizza-jamon', 'pizza-pepperoni'],
        addons: [],
      },
    ],
    ...overrides,
  });
}

function expectValidationError(fn, pattern) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof OrderValidationError);
    assert.match(error.message, pattern);
    return true;
  });
}

function createFakeRepository() {
  const orders = new Map();
  let nextId = 1;

  return {
    orders,

    async findByIdempotencyKey(idempotencyKey) {
      return orders.get(idempotencyKey) ?? null;
    },

    async create(orderData) {
      if (orders.has(orderData.idempotencyKey)) {
        const error = new Error('duplicate key');
        error.code = 11000;
        throw error;
      }

      const order = {
        ...orderData,
        _id: `order-${nextId}`,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      };

      nextId += 1;
      orders.set(orderData.idempotencyKey, order);

      return order;
    },
  };
}

test('valida una clave de idempotencia UUID v4', () => {
  assert.equal(validateIdempotencyKey(VALID_KEY), VALID_KEY);
  assert.equal(
    validateIdempotencyKey(' 123E4567-E89B-42D3-A456-426614174000 '),
    '123E4567-E89B-42D3-A456-426614174000'
  );

  expectValidationError(
    () => validateIdempotencyKey('123e4567-e89b-12d3-a456-426614174000'),
    /UUID v4/
  );
  expectValidationError(() => validateIdempotencyKey(''), /UUID v4/);
});

test('calcula una pizza normal y sus adicionales desde el menú', () => {
  const payload = makePayload({
    items: [
      {
        productKey: 'pizza-jamon',
        presentationKey: 'familiar',
        quantity: 2,
        flavors: [],
        addons: [
          { key: 'queso-extra', quantity: 2 },
          { key: 'borde-queso', quantity: 1 },
        ],
      },
    ],
  });

  const result = validateAndPriceOrder(payload, menu);
  const [item] = result.orderData.items;

  assert.equal(item.basePriceCents, 1200);
  assert.equal(item.addonsSubtotalCents, 400);
  assert.equal(item.unitPriceCents, 1600);
  assert.equal(item.lineTotalCents, 3200);
  assert.equal(item.quantity, 2);
  assert.equal(result.orderData.subtotalCents, 3200);
  assert.equal(result.orderData.totalCents, 3200);
  assert.equal(result.orderData.currency, 'USD');
  assert.equal(result.orderData.status, 'pending');
  assert.equal(item.productName, 'Amantes al Jamón');
  assert.equal(item.presentationName, 'Familiar');
});

test('acepta una pizza Mixta con dos sabores distintos', () => {
  const result = validateAndPriceOrder(makeMixedPayload(), menu);
  const [item] = result.orderData.items;

  assert.equal(item.isMix, true);
  assert.equal(item.unitPriceCents, 1400);
  assert.deepEqual(item.flavors, [
    { key: 'pizza-jamon', name: 'Amantes al Jamón' },
    { key: 'pizza-pepperoni', name: 'Pepperoni' },
  ]);
});

test('respeta los sabores permitidos de una Mixta', () => {
  const result = validateAndPriceOrder(
    makePayload({
      items: [
        {
          productKey: 'pizza-mixta-especial',
          presentationKey: 'familiar',
          quantity: 1,
          flavors: ['pizza-jamon', 'pizza-pepperoni'],
          addons: [],
        },
      ],
    }),
    menu
  );

  assert.equal(result.orderData.items[0].lineTotalCents, 1500);
});

test('rechaza productos inexistentes o no disponibles', () => {
  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-inexistente',
              presentationKey: 'familiar',
              quantity: 1,
              flavors: [],
              addons: [],
            },
          ],
        }),
        menu
      ),
    /no está disponible/
  );

  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-jamon',
              presentationKey: 'familiar',
              quantity: 1,
              flavors: [],
              addons: [],
            },
          ],
        }),
        {
          ...menu,
          products: menu.products.filter(
            (product) => product.key !== 'pizza-jamon'
          ),
        }
      ),
    /no está disponible/
  );
});

test('rechaza presentaciones inválidas o sin precio', () => {
  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-jamon',
              presentationKey: 'gigante',
              quantity: 1,
              flavors: [],
              addons: [],
            },
          ],
        }),
        menu
      ),
    /no está disponible/
  );

  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-jamon',
              presentationKey: 'familiar',
              quantity: 1,
              flavors: [],
              addons: [],
            },
          ],
        }),
        {
          ...menu,
          products: [
            {
              ...menu.products[0],
              variants: [
                {
                  key: 'familiar',
                  name: 'Familiar',
                  priceCents: null,
                  available: true,
                },
              ],
            },
          ],
        }
      ),
    /no está disponible/
  );
});

test('rechaza sabores incorrectos, repetidos o una Mixta como sabor', () => {
  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-mixta',
              presentationKey: 'familiar',
              quantity: 1,
              flavors: ['pizza-jamon'],
              addons: [],
            },
          ],
        }),
        menu
      ),
    /exactamente dos sabores/
  );

  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-mixta',
              presentationKey: 'familiar',
              quantity: 1,
              flavors: ['pizza-jamon', 'pizza-jamon'],
              addons: [],
            },
          ],
        }),
        menu
      ),
    /diferentes/
  );

  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-mixta',
              presentationKey: 'familiar',
              quantity: 1,
              flavors: ['pizza-mixta', 'pizza-jamon'],
              addons: [],
            },
          ],
        }),
        menu
      ),
    /no puede seleccionarse/
  );

  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-mixta-otra',
              presentationKey: 'familiar',
              quantity: 1,
              flavors: ['pizza-mixta', 'pizza-jamon'],
              addons: [],
            },
          ],
        }),
        menu
      ),
    /no puede usarse como sabor/
  );
});

test('rechaza sabores en productos que no son Mixta', () => {
  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-jamon',
              presentationKey: 'familiar',
              quantity: 1,
              flavors: ['pizza-pepperoni'],
              addons: [],
            },
          ],
        }),
        menu
      ),
    /no admite selección de sabores/
  );
});

test('rechaza adicionales inválidos, no aplicables o duplicados', () => {
  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-jamon',
              presentationKey: 'familiar',
              quantity: 1,
              flavors: [],
              addons: [{ key: 'postre', quantity: 1 }],
            },
          ],
        }),
        menu
      ),
    /no aplica/
  );

  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-jamon',
              presentationKey: 'familiar',
              quantity: 1,
              flavors: [],
              addons: [{ key: 'salsa-simple', quantity: 1 }],
            },
          ],
        }),
        menu
      ),
    /no aplica al tipo/
  );

  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-jamon',
              presentationKey: 'familiar',
              quantity: 1,
              flavors: [],
              addons: [
                { key: 'queso-extra', quantity: 1 },
                { key: 'queso-extra', quantity: 1 },
              ],
            },
          ],
        }),
        menu
      ),
    /duplicado/
  );
});

test('aplica límites de adicionales', () => {
  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-jamon',
              presentationKey: 'familiar',
              quantity: 1,
              flavors: [],
              addons: [{ key: 'queso-extra', quantity: 4 }],
            },
          ],
        }),
        menu
      ),
    /entre 1 y 3/
  );

  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-jamon',
              presentationKey: 'familiar',
              quantity: 1,
              flavors: [],
              addons: [{ key: 'extra-carne', quantity: 2 }],
            },
          ],
        }),
        menu
      ),
    /entre 1 y 1/
  );

  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-jamon',
              presentationKey: 'familiar',
              quantity: 1,
              flavors: [],
              addons: [
                { key: 'queso-extra', quantity: 3 },
                { key: 'borde-queso', quantity: 3 },
                { key: 'aceitunas', quantity: 3 },
                { key: 'pina-extra', quantity: 3 },
              ],
            },
          ],
        }),
        menu
      ),
    /máximo de 10 unidades/
  );
});

test('valida delivery, pickup y campos del cliente', () => {
  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          modality: 'delivery',
          address: '   ',
        }),
        menu
      ),
    /dirección/
  );

  const pickup = validateAndPriceOrder(
    makePayload({
      modality: 'pickup',
      address: 'No debe guardarse',
    }),
    menu
  );

  assert.equal(pickup.orderData.modality, 'pickup');
  assert.equal(pickup.orderData.address, '');

  const delivery = validateAndPriceOrder(
    makePayload({
      modality: 'delivery',
      address: 'Calle 123, casa 4',
      reference: 'Frente al parque',
      observations: 'Sin cebolla',
    }),
    menu
  );

  assert.equal(delivery.orderData.address, 'Calle 123, casa 4');
  assert.equal(delivery.orderData.reference, 'Frente al parque');
  assert.equal(delivery.orderData.observations, 'Sin cebolla');

  expectValidationError(
    () => validateAndPriceOrder(makePayload({ customer: { name: '   ' } }), menu),
    /nombre/
  );

  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({ customer: { name: 'a'.repeat(81) } }),
        menu
      ),
    /80 caracteres/
  );

  expectValidationError(
    () => validateAndPriceOrder(makePayload({ modality: 'otra' }), menu),
    /modalidad/
  );
});

test('valida cantidades y número de líneas', () => {
  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-jamon',
              presentationKey: 'familiar',
              quantity: 0,
              flavors: [],
              addons: [],
            },
          ],
        }),
        menu
      ),
    /entre 1 y 99/
  );

  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-jamon',
              presentationKey: 'familiar',
              quantity: 100,
              flavors: [],
              addons: [],
            },
          ],
        }),
        menu
      ),
    /entre 1 y 99/
  );

  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: Array.from({ length: 51 }, () => ({
            productKey: 'pizza-jamon',
            presentationKey: 'familiar',
            quantity: 1,
            flavors: [],
            addons: [],
          })),
        }),
        menu
      ),
    /50 líneas/
  );
});

test('rechaza campos monetarios y datos comerciales enviados por el cliente', () => {
  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-jamon',
              presentationKey: 'familiar',
              quantity: 1,
              unitPriceCents: 1,
              flavors: [],
              addons: [],
            },
          ],
        }),
        menu
      ),
    /campo monetario/
  );

  expectValidationError(
    () => validateAndPriceOrder(makePayload({ totalCents: 1 }), menu),
    /campo monetario/
  );

  expectValidationError(
    () =>
      validateAndPriceOrder(
        makePayload({
          items: [
            {
              productKey: 'pizza-jamon',
              presentationKey: 'familiar',
              quantity: 1,
              flavors: [],
              addons: [{ key: 'queso-extra', quantity: 1, priceCents: 0 }],
            },
          ],
        }),
        menu
      ),
    /campo monetario/
  );
});

test('el hash normalizado no depende del orden de sabores ni adicionales', () => {
  const first = validateAndPriceOrder(
    makePayload({
      items: [
        {
          productKey: 'pizza-mixta',
          presentationKey: 'familiar',
          quantity: 1,
          flavors: ['pizza-jamon', 'pizza-pepperoni'],
          addons: [
            { key: 'queso-extra', quantity: 1 },
            { key: 'borde-queso', quantity: 1 },
          ],
        },
      ],
    }),
    menu
  );
  const reordered = validateAndPriceOrder(
    makePayload({
      items: [
        {
          productKey: 'pizza-mixta',
          presentationKey: 'familiar',
          quantity: 1,
          flavors: ['pizza-pepperoni', 'pizza-jamon'],
          addons: [
            { key: 'borde-queso', quantity: 1 },
            { key: 'queso-extra', quantity: 1 },
          ],
        },
      ],
    }),
    menu
  );

  assert.equal(
    hashNormalizedRequest(first.normalizedRequest),
    hashNormalizedRequest(reordered.normalizedRequest)
  );

  const changed = validateAndPriceOrder(
    makePayload({
      items: [
        {
          productKey: 'pizza-mixta',
          presentationKey: 'familiar',
          quantity: 2,
          flavors: ['pizza-jamon', 'pizza-pepperoni'],
          addons: [],
        },
      ],
    }),
    menu
  );

  assert.notEqual(
    hashNormalizedRequest(first.normalizedRequest),
    hashNormalizedRequest(changed.normalizedRequest)
  );
});

test('crea una orden y devuelve la misma orden en reintentos idempotentes', async () => {
  const repository = createFakeRepository();
  const payload = makePayload();

  const first = await createOrder({
    payload,
    idempotencyKey: VALID_KEY,
    menuLoader: async () => menu,
    repository,
  });
  const second = await createOrder({
    payload,
    idempotencyKey: VALID_KEY,
    menuLoader: async () => menu,
    repository,
  });

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(first.order.orderId, second.order.orderId);
  assert.equal(first.order.status, 'pending');
  assert.equal(first.order.totalCents, 1200);
  assert.equal(repository.orders.size, 1);
});

test('responde conflicto si la misma clave tiene contenido diferente', async () => {
  const repository = createFakeRepository();

  await createOrder({
    payload: makePayload(),
    idempotencyKey: VALID_KEY,
    menuLoader: async () => menu,
    repository,
  });

  await assert.rejects(
    () =>
      createOrder({
        payload: makePayload({
          items: [
            {
              productKey: 'pizza-jamon',
              presentationKey: 'familiar',
              quantity: 2,
              flavors: [],
              addons: [],
            },
          ],
        }),
        idempotencyKey: VALID_KEY,
        menuLoader: async () => menu,
        repository,
      }),
    (error) => {
      assert.ok(error instanceof OrderConflictError);
      assert.equal(error.statusCode, 409);
      return true;
    }
  );
});

test('recupera la orden existente tras un error de índice duplicado 11000', async () => {
  const firstRepository = createFakeRepository();

  await createOrder({
    payload: makePayload(),
    idempotencyKey: VALID_KEY,
    menuLoader: async () => menu,
    repository: firstRepository,
  });

  const existingOrder = firstRepository.orders.get(VALID_KEY);
  let findCalls = 0;
  const raceRepository = {
    async findByIdempotencyKey() {
      findCalls += 1;
      return findCalls === 1 ? null : existingOrder;
    },
    async create() {
      const error = new Error('duplicate key');
      error.code = 11000;
      throw error;
    },
  };

  const result = await createOrder({
    payload: makePayload(),
    idempotencyKey: VALID_KEY,
    menuLoader: async () => menu,
    repository: raceRepository,
  });

  assert.equal(result.duplicate, true);
  assert.equal(result.order.orderId, 'order-1');
});

test('valida la clave de idempotencia antes de consultar el menú', async () => {
  await assert.rejects(
    () =>
      createOrder({
        payload: makePayload(),
        idempotencyKey: 'no-es-uuid',
        menuLoader: async () => {
          throw new Error('No debería consultarse el menú');
        },
        repository: createFakeRepository(),
      }),
    (error) => error instanceof OrderValidationError
  );
});

test('el modelo aplica valores por defecto y normaliza pickup', async () => {
  const { orderData } = validateAndPriceOrder(makePayload(), menu);
  const order = new Order({
    idempotencyKey: VALID_KEY,
    requestHash: 'a'.repeat(64),
    ...orderData,
    address: 'Dirección que debe limpiarse',
  });

  await order.validate();

  assert.equal(order.status, 'pending');
  assert.equal(order.currency, 'USD');
  assert.equal(order.address, '');
  assert.equal(order.items.length, 1);
  assert.equal(order.totalCents, order.subtotalCents);
});

test('el modelo exige dirección solo para delivery', async () => {
  const { orderData } = validateAndPriceOrder(
    makePayload({ modality: 'delivery', address: 'Calle 1' }),
    menu
  );
  const order = new Order({
    idempotencyKey: VALID_KEY,
    requestHash: 'b'.repeat(64),
    ...orderData,
    address: '',
  });

  await assert.rejects(() => order.validate(), /dirección/);
});
