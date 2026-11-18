const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createOrder,
  OrderConflictError,
  OrderValidationError,
} = require('../src/services/orderService');

const VALID_KEY = '8ec7db09-fa6a-4d0d-8dd4-6bc95fa8030f';
const OTHER_KEY = '123e4567-e89b-42d3-a456-426614174000';

// Menú mínimo y catálogo simulado: estas pruebas nunca consultan MongoDB.
const MENU = {
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
      ],
      addonGroupKeys: [],
      mixConfig: null,
    },
  ],
  addons: [],
  limits: { maxQuantityPerAddon: 3, maxAddonUnitsPerPizza: 10 },
};

function makePayload(overrides = {}) {
  return {
    customer: { name: 'Cliente de prueba aislada' },
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

function createMockRepository() {
  const orders = new Map();
  const calls = { find: 0, create: 0 };
  let nextId = 1;

  return {
    orders,
    calls,

    async findByIdempotencyKey(idempotencyKey) {
      calls.find += 1;
      return orders.get(idempotencyKey) ?? null;
    },

    async create(orderData) {
      calls.create += 1;

      if (orders.has(orderData.idempotencyKey)) {
        const error = new Error('duplicate key');
        error.code = 11000;
        throw error;
      }

      const order = {
        ...orderData,
        _id: `mock-order-${nextId}`,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      };

      nextId += 1;
      orders.set(orderData.idempotencyKey, order);

      return order;
    },
  };
}

async function create(payload, idempotencyKey, repository) {
  return createOrder({
    payload,
    idempotencyKey,
    menuLoader: async () => MENU,
    repository,
  });
}

test('registro válido con persistencia simulada', async () => {
  const repository = createMockRepository();

  const result = await create(makePayload(), VALID_KEY, repository);

  assert.equal(result.duplicate, false);
  assert.equal(result.order.orderId, 'mock-order-1');
  assert.equal(result.order.status, 'pending');
  assert.equal(result.order.totalCents, 1200);
  assert.equal(result.order.currency, 'USD');
  assert.equal(repository.calls.create, 1);
  assert.equal(repository.orders.size, 1);

  const stored = repository.orders.get(VALID_KEY);
  assert.equal(stored.status, 'pending');
  assert.equal(stored.items[0].productKey, 'pizza-jamon');
  assert.equal(typeof stored.requestHash, 'string');
  assert.match(stored.requestHash, /^[a-f0-9]{64}$/);
});

test('idempotencia: el mismo clave y payload devuelven la misma orden', async () => {
  const repository = createMockRepository();
  const payload = makePayload();

  const first = await create(payload, VALID_KEY, repository);
  const second = await create(payload, VALID_KEY, repository);

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.order.orderId, first.order.orderId);
  assert.equal(repository.calls.create, 1);
  assert.equal(repository.orders.size, 1);
});

test('idempotencia: la misma clave con otro contenido produce conflicto', async () => {
  const repository = createMockRepository();

  await create(makePayload(), VALID_KEY, repository);

  await assert.rejects(
    () =>
      create(
        makePayload({
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
        VALID_KEY,
        repository
      ),
    (error) => {
      assert.ok(error instanceof OrderConflictError);
      assert.equal(error.statusCode, 409);
      return true;
    }
  );

  assert.equal(repository.calls.create, 1);
  assert.equal(repository.orders.size, 1);
});

test('solicitudes inválidas se rechazan sin escribir en el repositorio', async () => {
  let menuCalls = 0;
  const repository = createMockRepository();
  const invalidCases = [
    { key: 'no-es-uuid', payload: makePayload() },
    {
      key: VALID_KEY,
      payload: makePayload({
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
    },
    {
      key: VALID_KEY,
      payload: makePayload({ totalCents: 1 }),
    },
    {
      key: VALID_KEY,
      payload: makePayload({
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
    },
  ];

  for (const invalid of invalidCases) {
    await assert.rejects(
      () =>
        createOrder({
          payload: invalid.payload,
          idempotencyKey: invalid.key,
          menuLoader: async () => {
            menuCalls += 1;
            return MENU;
          },
          repository,
        }),
      (error) => {
        assert.ok(error instanceof OrderValidationError);
        assert.equal(error.statusCode, 400);
        return true;
      }
    );
  }

  assert.equal(repository.calls.create, 0);
  assert.equal(repository.orders.size, 0);
  // La clave inválida se rechaza antes de consultar el catálogo.
  assert.equal(menuCalls, invalidCases.length - 1);
  assert.notEqual(VALID_KEY, OTHER_KEY);
});
