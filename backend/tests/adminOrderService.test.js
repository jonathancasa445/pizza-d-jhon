const test = require('node:test');
const assert = require('node:assert/strict');

const {
  listOrders,
  getOrderDetail,
  getOrderStats,
} = require('../src/services/adminOrderService');

const ORDER_ID = '6afd04950791c67adc5ba1fc';
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');

function makeOrder(overrides = {}) {
  return {
    _id: ORDER_ID,
    idempotencyKey: '8ec7db09-fa6a-4d0d-8dd4-6bc95fa8030f',
    requestHash: 'a'.repeat(64),
    customer: { name: 'Cliente de prueba' },
    modality: 'pickup',
    address: '',
    reference: '',
    observations: '',
    items: [],
    subtotalCents: 1200,
    totalCents: 1200,
    currency: 'USD',
    status: 'confirmed',
    statusHistory: [
      {
        previousStatus: null,
        newStatus: 'pending',
        changedBy: 'system',
        changedAt: CREATED_AT,
        reason: '',
      },
    ],
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

function createRepository({ orders = [], total = 0, stats = [] } = {}) {
  const calls = { list: [], count: [], stats: 0, findById: [] };

  return {
    calls,
    async list(args) {
      calls.list.push(args);
      return orders;
    },
    async count(filter) {
      calls.count.push(filter);
      return total;
    },
    async stats() {
      calls.stats += 1;
      return stats;
    },
    async findById(id) {
      calls.findById.push(id);
      return orders.find((order) => String(order._id) === String(id)) ?? null;
    },
  };
}

test('listOrders usa paginación por defecto y orden descendente', async () => {
  const repository = createRepository({
    orders: [makeOrder(), makeOrder({ _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' })],
    total: 2,
  });

  const result = await listOrders({ repository });

  assert.deepEqual(repository.calls.list[0], {
    filter: {},
    skip: 0,
    limit: 20,
    sort: { createdAt: -1 },
  });
  assert.deepEqual(repository.calls.count[0], {});
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.pagination, {
    page: 1,
    limit: 20,
    total: 2,
    pages: 1,
  });
});

test('listOrders aplica filtro de estado y paginación personalizada', async () => {
  const repository = createRepository({ total: 12 });

  const result = await listOrders({
    status: 'confirmed',
    page: 2,
    limit: 5,
    repository,
  });

  assert.deepEqual(repository.calls.list[0].filter, { status: 'confirmed' });
  assert.equal(repository.calls.list[0].skip, 5);
  assert.equal(repository.calls.list[0].limit, 5);
  assert.deepEqual(result.pagination, {
    page: 2,
    limit: 5,
    total: 12,
    pages: 3,
  });
});

test('listOrders valida filtros y límites', async () => {
  const repository = createRepository();

  await assert.rejects(
    () => listOrders({ status: 'estado-invalido', repository }),
    (error) => error.code === 'INVALID_STATUS_FILTER'
  );
  await assert.rejects(
    () => listOrders({ limit: 101, repository }),
    (error) => error.code === 'INVALID_PAGINATION'
  );
  await assert.rejects(
    () => listOrders({ page: 0, repository }),
    (error) => error.code === 'INVALID_PAGINATION'
  );
  assert.equal(repository.calls.list.length, 0);
});

test('getOrderDetail devuelve el historial completo', async () => {
  const entry = {
    previousStatus: 'pending',
    newStatus: 'confirmed',
    changedBy: 'admin-1',
    changedAt: CREATED_AT,
    reason: 'Confirmación',
  };
  const order = makeOrder({
    statusHistory: [
      {
        previousStatus: null,
        newStatus: 'pending',
        changedBy: 'system',
        changedAt: CREATED_AT,
        reason: '',
      },
      entry,
    ],
  });
  const repository = createRepository({ orders: [order] });

  const result = await getOrderDetail({ orderId: ORDER_ID, repository });

  assert.equal(result.orderId, ORDER_ID);
  assert.equal(result.statusHistory.length, 2);
  assert.deepEqual(result.statusHistory[1], entry);
  assert.equal('idempotencyKey' in result, false);
  assert.equal('requestHash' in result, false);
});

test('getOrderDetail admite pedidos antiguos sin statusHistory', async () => {
  const legacy = makeOrder();
  delete legacy.statusHistory;
  const repository = createRepository({ orders: [legacy] });

  const result = await getOrderDetail({ orderId: ORDER_ID, repository });

  assert.deepEqual(result.statusHistory, []);
  assert.equal(result.totalCents, 1200);
});

test('getOrderDetail responde 404 si el pedido no existe', async () => {
  await assert.rejects(
    () =>
      getOrderDetail({
        orderId: ORDER_ID,
        repository: createRepository(),
      }),
    (error) =>
      error.code === 'ORDER_NOT_FOUND' && error.statusCode === 404
  );
});

test('getOrderStats separa totales, estados y pedidos aceptados', async () => {
  const repository = createRepository({
    stats: [
      { _id: 'pending', count: 4 },
      { _id: 'confirmed', count: 2 },
      { _id: 'preparing', count: 1 },
      { _id: 'on_the_way', count: 3 },
      { _id: 'delivered', count: 5 },
      { _id: 'cancelled', count: 2 },
      { _id: 'delivered\n', count: 1 },
    ],
  });

  const result = await getOrderStats({ repository });

  assert.equal(result.total, 18);
  assert.equal(result.byStatus.pending, 4);
  assert.equal(result.byStatus.confirmed, 2);
  assert.equal(result.byStatus.preparing, 1);
  assert.equal(result.byStatus.on_the_way, 3);
  assert.equal(result.byStatus.delivered, 5);
  assert.equal(result.byStatus.cancelled, 2);
  assert.equal(result.byStatus.unclassified, 1);
  assert.equal(result.accepted, 11);
  assert.equal('sales' in result, false);
});

test('la serialización administrativa no expone secretos', async () => {
  const repository = createRepository({ orders: [makeOrder()], total: 1 });
  const list = await listOrders({ repository });
  const detail = await getOrderDetail({ orderId: ORDER_ID, repository });
  const serialized = JSON.stringify({ list, detail });

  for (const secret of [
    'passwordHash',
    'passwordSalt',
    'passwordParams',
    'idempotencyKey',
    'requestHash',
    'jwt',
    'cookie',
    'JWT_SECRET',
  ]) {
    assert.equal(serialized.includes(secret), false);
  }
});

test('listOrders devuelve páginas vacías cuando el total es cero', async () => {
  const repository = createRepository({ orders: [], total: 0 });

  const result = await listOrders({ repository });

  assert.deepEqual(result.items, []);
  assert.deepEqual(result.pagination, {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
});

test('listOrders acepta los límites exactos 1 y 100', async () => {
  const minimum = createRepository({ total: 1 });
  const minimumResult = await listOrders({ limit: 1, repository: minimum });

  assert.equal(minimum.calls.list[0].limit, 1);
  assert.equal(minimumResult.pagination.limit, 1);
  assert.equal(minimumResult.pagination.pages, 1);

  const maximum = createRepository({ total: 250 });
  const maximumResult = await listOrders({ limit: 100, repository: maximum });

  assert.equal(maximum.calls.list[0].limit, 100);
  assert.equal(maximumResult.pagination.limit, 100);
  assert.equal(maximumResult.pagination.pages, 3);
});
