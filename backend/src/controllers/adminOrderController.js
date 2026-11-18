const { OrderManagementError } = require('../services/orderManagementErrors');

const STATUS_BODY_KEYS = Object.freeze(['status', 'reason']);
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

function validateOrderId(value) {
  if (typeof value !== 'string' || !OBJECT_ID_PATTERN.test(value)) {
    throw new OrderManagementError(
      'El identificador del pedido no es válido.',
      'INVALID_ORDER_ID',
      400
    );
  }

  return value;
}

function validateStatusBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new OrderManagementError(
      'El cuerpo de la solicitud debe ser un objeto.',
      'INVALID_BODY'
    );
  }

  const unexpected = Object.keys(body).find(
    (key) => !STATUS_BODY_KEYS.includes(key)
  );

  if (unexpected) {
    throw new OrderManagementError(
      `El campo "${unexpected}" no está permitido en un cambio de estado.`,
      'INVALID_BODY'
    );
  }

  return { status: body.status, reason: body.reason };
}

function createAdminOrderController({
  listOrders,
  getOrderDetail,
  getOrderStats,
  changeOrderStatus,
  logger = console,
} = {}) {
  function sendError(res, error) {
    if (error instanceof OrderManagementError) {
      return res.status(error.statusCode).json({
        message: error.message,
        code: error.code,
      });
    }

    // Sin mensajes internos, stacks ni secretos en la respuesta.
    logger.error?.('Error inesperado en la API administrativa de pedidos.');

    return res.status(500).json({
      message: 'No se pudo completar la solicitud.',
      code: 'ADMIN_ORDERS_ERROR',
    });
  }

  async function list(req, res) {
    try {
      const result = await listOrders({
        status: req.query?.status,
        page: req.query?.page,
        limit: req.query?.limit,
      });

      return res.status(200).json(result);
    } catch (error) {
      return sendError(res, error);
    }
  }

  async function stats(req, res) {
    try {
      return res.status(200).json(await getOrderStats());
    } catch (error) {
      return sendError(res, error);
    }
  }

  async function detail(req, res) {
    try {
      const orderId = validateOrderId(req.params?.id);

      return res.status(200).json(await getOrderDetail({ orderId }));
    } catch (error) {
      return sendError(res, error);
    }
  }

  async function changeStatus(req, res) {
    try {
      const orderId = validateOrderId(req.params?.id);
      const body = validateStatusBody(req.body);

      const result = await changeOrderStatus({
        orderId,
        status: body.status,
        reason: body.reason,
        // Identidad tomada solo del contexto autenticado por requireAuth.
        adminId: req.admin?.id,
      });

      return res.status(200).json(result);
    } catch (error) {
      return sendError(res, error);
    }
  }

  return { list, stats, detail, changeStatus };
}

module.exports = {
  createAdminOrderController,
  validateOrderId,
  validateStatusBody,
};
