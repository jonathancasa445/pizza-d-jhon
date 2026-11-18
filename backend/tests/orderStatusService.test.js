const test = require('node:test');
const assert = require('node:assert/strict');

const mongoose = require('mongoose');

const Order = require('../src/models/Order');
const {
  ORDER_STATUS_FLOW,
  STATUS_RANK,
} = require('../src/constants/order');
const {
  orderAdminRepository,
} = require('../src/services/adminOrderService');
const {
  changeOrderStatus,
  normalizeReason,
  validateStatusChange,
} = require('../src/services/orderStatusService');

const ORDER_ID = '6afd04950791c67adc5ba1fc';
const ADMIN_ID = 'admin-1';
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');

function makeHistoryEntry(overrides = {}) {
  return {
    previousStatus: null,
    newStatus: 'pending',
    changedBy: 'system',
    changedAt: CREATED_AT,
    reason: '',
    ...overrides,
  };
}

function makeOrder(overrides = {}) {
  return {
    _id: ORDER_ID,
    idempotencyKey: '8ec7db09-fa6a-4d0d-8dd4-6bc95fa8030f',
    requestHash: 'a'.repeat(64),
    customer: { name: 'Cliente de prueba' },
    modality: 'delivery',
    address: 'Calle 1',
    reference: '',
    observations: '',
    items: [
      {
        productKey: 'pizza-jamon',
        productName: 'Jamón',
        presentationKey: 'familiar',
        presentationName: 'Familiar',
        basePriceCents: 1000,
        addonsSubtotalCents: 0,
        unitPriceCents: 1000,
        quantity: 1,
        lineTotalCents: 1000,
        flavors: [],
        addons: [],
      },
    ],
    subtotalCents: 1000,
    totalCents: 1000,
    currency: 'USD',
    status: 'pending',
    statusHistory: [makeHistoryEntry()],
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

function createRepository(order) {
  const calls = [];

  return {
    calls,
    async findById(id) {
      calls.push({ method: 'findById', id });
      return order;
    },
    async updateStatus(args) {
      calls.push({ method: 'updateStatus', args });
      return {
        ...order,
        status: args.status,
        statusHistory: [...(order.statusHistory ?? []), args.entry],
        updatedAt: args.updatedAt,
      };
    },
  };
}

test('validateStatusChange acepta avances sin motivo', () => {
  assert.equal(
    validateStatusChange({
      currentStatus: 'pending',
      newStatus: 'confirmed',
      modality: 'delivery',
      reason: '',
    }),
    ''
  );
  assert.equal(
    validateStatusChange({
      currentStatus: 'preparing',
      newStatus: 'on_the_way',
      modality: 'delivery',
    }),
    ''
  );
});

test('validateStatusChange rechaza estados inválidos y cambios sin efecto', () => {
  assert.throws(
    () =>
      validateStatusChange({
        currentStatus: 'pending',
        newStatus: 'desconocido',
        modality: 'delivery',
      }),
    (error) => error.code === 'INVALID_STATUS'
  );

  assert.throws(
    () =>
      validateStatusChange({
        currentStatus: 'pending',
        newStatus: 'pending',
        modality: 'delivery',
      }),
    (error) => error.code === 'NO_STATUS_CHANGE'
  );

  assert.throws(
    () =>
      validateStatusChange({
        currentStatus: 'estado-invalido',
        newStatus: 'confirmed',
        modality: 'delivery',
        reason: 'corrección',
      }),
    (error) =>
      error.code === 'INVALID_CURRENT_STATUS' && error.statusCode === 409
  );
});

test('validateStatusChange impide on_the_way en pedidos pickup', () => {
  assert.throws(
    () =>
      validateStatusChange({
        currentStatus: 'confirmed',
        newStatus: 'on_the_way',
        modality: 'pickup',
        reason: 'intento inválido',
      }),
    (error) => error.code === 'INVALID_STATUS_FOR_MODALITY'
  );
});

test('validateStatusChange exige motivo al retroceder, cancelar o salir de terminal', () => {
  const cases = [
    ['confirmed', 'pending', 'delivery'],
    ['delivered', 'preparing', 'delivery'],
    ['cancelled', 'confirmed', 'delivery'],
    ['preparing', 'cancelled', 'delivery'],
  ];

  for (const [currentStatus, newStatus, modality] of cases) {
    assert.throws(
      () => validateStatusChange({ currentStatus, newStatus, modality }),
      (error) => error.code === 'REASON_REQUIRED'
    );

    assert.equal(
      validateStatusChange({
        currentStatus,
        newStatus,
        modality,
        reason: 'Corrección autorizada',
      }),
      'Corrección autorizada'
    );
  }
});

test('validateStatusChange limita el motivo a 300 caracteres', () => {
  assert.throws(
    () =>
      validateStatusChange({
        currentStatus: 'confirmed',
        newStatus: 'pending',
        modality: 'delivery',
        reason: 'x'.repeat(301),
      }),
    (error) => error.code === 'INVALID_REASON'
  );

  assert.equal(
    validateStatusChange({
      currentStatus: 'confirmed',
      newStatus: 'pending',
      modality: 'delivery',
      reason: 'x'.repeat(300),
    }).length,
    300
  );
});

test('changeOrderStatus agrega una entrada sin perder las anteriores', async () => {
  const previousEntry = makeHistoryEntry({
    previousStatus: null,
    newStatus: 'pending',
  });
  const order = makeOrder({
    status: 'confirmed',
    statusHistory: [
      previousEntry,
      makeHistoryEntry({
        previousStatus: 'pending',
        newStatus: 'confirmed',
        changedBy: ADMIN_ID,
      }),
    ],
  });
  const repository = createRepository(order);
  const changedAt = new Date('2026-01-02T00:00:00.000Z');

  const result = await changeOrderStatus({
    orderId: ORDER_ID,
    status: 'preparing',
    reason: '',
    adminId: ADMIN_ID,
    repository,
    now: () => changedAt,
  });

  assert.equal(result.status, 'preparing');
  assert.equal(result.statusHistory.length, 3);
  assert.deepEqual(result.statusHistory[0], {
    previousStatus: null,
    newStatus: 'pending',
    changedBy: 'system',
    changedAt: CREATED_AT,
    reason: '',
  });
  assert.deepEqual(result.statusHistory[2], {
    previousStatus: 'confirmed',
    newStatus: 'preparing',
    changedBy: ADMIN_ID,
    changedAt,
    reason: '',
  });

  const updateCall = repository.calls.find((call) => call.method === 'updateStatus');
  assert.equal(updateCall.args.expectedStatus, 'confirmed');
  assert.equal(updateCall.args.entry.changedBy, ADMIN_ID);
  assert.equal(Object.hasOwn(result, 'idempotencyKey'), false);
  assert.equal(Object.hasOwn(result, 'requestHash'), false);
});

test('changeOrderStatus exige un administrador autenticado', async () => {
  const repository = createRepository(makeOrder());

  await assert.rejects(
    () =>
      changeOrderStatus({
        orderId: ORDER_ID,
        status: 'confirmed',
        adminId: '',
        repository,
      }),
    (error) => error.code === 'INVALID_ADMIN_ID'
  );

  assert.equal(repository.calls.length, 0);
});

test('changeOrderStatus devuelve 409 si el estado cambió concurrentemente', async () => {
  const repository = {
    async findById() {
      return makeOrder({ status: 'confirmed', statusHistory: [] });
    },
    async updateStatus() {
      return null;
    },
  };

  await assert.rejects(
    () =>
      changeOrderStatus({
        orderId: ORDER_ID,
        status: 'preparing',
        adminId: ADMIN_ID,
        repository,
      }),
    (error) =>
      error.code === 'ORDER_STATUS_CONFLICT' && error.statusCode === 409
  );
});

test('el repositorio usa findOneAndUpdate atómico con $set y $push', async () => {
  const original = Order.findOneAndUpdate;
  const entry = makeHistoryEntry({
    previousStatus: 'pending',
    newStatus: 'confirmed',
    changedBy: ADMIN_ID,
  });
  let captured = null;

  Order.findOneAndUpdate = (filter, update, options) => {
    captured = { filter, update, options };
    return { lean: async () => makeOrder({ status: 'confirmed' }) };
  };

  try {
    await orderAdminRepository.updateStatus({
      orderId: ORDER_ID,
      expectedStatus: 'pending',
      status: 'confirmed',
      entry,
      updatedAt: CREATED_AT,
    });
  } finally {
    Order.findOneAndUpdate = original;
  }

  assert.ok(captured);
  assert.deepEqual(captured.filter, { _id: ORDER_ID, status: 'pending' });
  assert.deepEqual(Object.keys(captured.update).sort(), ['$push', '$set']);
  assert.deepEqual(Object.keys(captured.update.$set).sort(), [
    'status',
    'updatedAt',
  ]);
  assert.deepEqual(captured.update.$push, { statusHistory: entry });
  assert.equal(captured.options.new, true);
});

test('el modelo crea la entrada inicial del historial en pedidos nuevos', async () => {
  const order = new Order({
    idempotencyKey: '8ec7db09-fa6a-4d0d-8dd4-6bc95fa8030f',
    requestHash: 'a'.repeat(64),
    customer: { name: 'Cliente de prueba' },
    modality: 'pickup',
    items: [
      {
        productKey: 'pizza-jamon',
        productName: 'Jamón',
        presentationKey: 'familiar',
        presentationName: 'Familiar',
        basePriceCents: 1000,
        addonsSubtotalCents: 0,
        unitPriceCents: 1000,
        quantity: 1,
        lineTotalCents: 1000,
      },
    ],
    subtotalCents: 1000,
    totalCents: 1000,
  });

  await order.validate();

  assert.equal(order.statusHistory.length, 1);
  assert.equal(order.statusHistory[0].previousStatus, null);
  assert.equal(order.statusHistory[0].newStatus, 'pending');
  assert.equal(order.statusHistory[0].changedBy, 'system');
  assert.equal(order.statusHistory[0].reason, '');
  assert.ok(order.statusHistory[0].changedAt instanceof Date);
  assert.equal(mongoose.isValidObjectId(order._id), true);
});

test('guardar un pedido existente no agrega una entrada inicial', async () => {
  const existing = Order.hydrate({
    _id: ORDER_ID,
    idempotencyKey: '8ec7db09-fa6a-4d0d-8dd4-6bc95fa8030f',
    requestHash: 'a'.repeat(64),
    customer: { name: 'Cliente de prueba' },
    modality: 'pickup',
    items: [
      {
        productKey: 'pizza-jamon',
        productName: 'Jamón',
        presentationKey: 'familiar',
        presentationName: 'Familiar',
        basePriceCents: 1000,
        addonsSubtotalCents: 0,
        unitPriceCents: 1000,
        quantity: 1,
        lineTotalCents: 1000,
      },
    ],
    subtotalCents: 1000,
    totalCents: 1000,
    status: 'confirmed',
    statusHistory: [makeHistoryEntry()],
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });

  assert.equal(existing.isNew, false);

  // save() se simula con validate(): dispara el mismo hook sin escribir en BD.
  existing.save = async function saveWithoutDatabase() {
    await this.validate();
    return this;
  };

  await existing.save();

  assert.equal(existing.statusHistory.length, 1);
  assert.equal(existing.statusHistory[0].changedBy, 'system');
  assert.equal(existing.statusHistory[0].newStatus, 'pending');
});

test('normalizeReason aplica el límite de 300 caracteres después de trim()', () => {
  assert.equal(normalizeReason('  motivo  ', false), 'motivo');
  assert.equal(
    normalizeReason('x'.repeat(300) + '   ', false).length,
    300
  );
  assert.equal(
    normalizeReason(' '.repeat(5) + 'y'.repeat(300) + ' '.repeat(5), true)
      .length,
    300
  );

  assert.throws(
    () => normalizeReason('x'.repeat(301), false),
    (error) => error.code === 'INVALID_REASON'
  );
  assert.throws(
    () => normalizeReason('y'.repeat(301) + '  ', true),
    (error) => error.code === 'INVALID_REASON'
  );
});

test('STATUS_RANK se deriva de ORDER_STATUS_FLOW', () => {
  ORDER_STATUS_FLOW.forEach((status, index) => {
    assert.equal(STATUS_RANK[status], index);
  });
  assert.equal(STATUS_RANK.cancelled, -1);
});
