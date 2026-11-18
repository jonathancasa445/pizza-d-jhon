const mongoose = require('mongoose');

const Order = require('../models/Order');
const {
  ORDER_STATUSES,
  ACCEPTED_ORDER_STATUSES,
} = require('../constants/order');
const { OrderManagementError } = require('./orderManagementErrors');
const {
  serializeAdminOrder,
  serializeAdminOrderDetail,
} = require('./orderAdminSerializer');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function readInteger(value, fallback, label, min, max) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new OrderManagementError(
      `${label} debe ser un entero entre ${min} y ${max}.`,
      'INVALID_PAGINATION'
    );
  }

  return parsed;
}

function normalizeStatusFilter(status) {
  if (status === undefined || status === null || status === '') {
    return null;
  }

  if (typeof status !== 'string' || !ORDER_STATUSES.includes(status)) {
    throw new OrderManagementError(
      'El filtro de estado no es válido.',
      'INVALID_STATUS_FILTER'
    );
  }

  return status;
}

const orderAdminRepository = {
  async findById(orderId) {
    if (!mongoose.isValidObjectId(orderId)) {
      return null;
    }

    return Order.findById(orderId).lean();
  },

  async list({ filter, skip, limit, sort }) {
    return Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  },

  async count(filter) {
    return Order.countDocuments(filter);
  },

  async stats() {
    return Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
  },

  async updateStatus({ orderId, expectedStatus, status, entry, updatedAt }) {
    if (!mongoose.isValidObjectId(orderId)) {
      return null;
    }

    return Order.findOneAndUpdate(
      { _id: orderId, status: expectedStatus },
      {
        $set: { status, updatedAt },
        $push: { statusHistory: entry },
      },
      { new: true }
    ).lean();
  },
};

async function listOrders({
  status,
  page,
  limit,
  repository = orderAdminRepository,
} = {}) {
  const currentPage = readInteger(page, DEFAULT_PAGE, 'page', 1, Number.MAX_SAFE_INTEGER);
  const pageSize = readInteger(limit, DEFAULT_LIMIT, 'limit', 1, MAX_LIMIT);
  const statusFilter = normalizeStatusFilter(status);
  const filter = statusFilter ? { status: statusFilter } : {};

  const [orders, total] = await Promise.all([
    repository.list({
      filter,
      skip: (currentPage - 1) * pageSize,
      limit: pageSize,
      sort: { createdAt: -1 },
    }),
    repository.count(filter),
  ]);

  return {
    items: orders.map(serializeAdminOrder),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      pages: total === 0 ? 0 : Math.ceil(total / pageSize),
    },
  };
}

async function getOrderDetail({ orderId, repository = orderAdminRepository } = {}) {
  if (typeof orderId !== 'string' || !orderId.trim()) {
    throw new OrderManagementError(
      'El identificador del pedido es obligatorio.',
      'INVALID_ORDER_ID'
    );
  }

  const order = await repository.findById(orderId);

  if (!order) {
    throw new OrderManagementError(
      'Pedido no encontrado.',
      'ORDER_NOT_FOUND',
      404
    );
  }

  return serializeAdminOrderDetail(order);
}

async function getOrderStats({ repository = orderAdminRepository } = {}) {
  const rows = await repository.stats();
  const byStatus = {};

  for (const status of ORDER_STATUSES) {
    byStatus[status] = 0;
  }

  let total = 0;

  for (const row of rows) {
    const count = Number(row?.count) || 0;
    total += count;

    const status = row?._id;

    if (typeof status === 'string' && ORDER_STATUSES.includes(status)) {
      byStatus[status] += count;
    } else {
      // Estado heredado o no reconocido: se conserva en el total, no se inventa
      // un estado nuevo ni se cuenta como aceptado.
      byStatus.unclassified = (byStatus.unclassified ?? 0) + count;
    }
  }

  const accepted = ACCEPTED_ORDER_STATUSES.reduce(
    (sum, status) => sum + byStatus[status],
    0
  );

  return { total, byStatus, accepted };
}

module.exports = {
  orderAdminRepository,
  listOrders,
  getOrderDetail,
  getOrderStats,
};
