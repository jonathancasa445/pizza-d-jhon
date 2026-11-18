const {
  createOrder,
  OrderConflictError,
  OrderValidationError,
} = require('../services/orderService');

async function postOrder(req, res) {
  try {
    const result = await createOrder({
      payload: req.body,
      idempotencyKey: req.get('Idempotency-Key'),
    });

    return res.status(result.duplicate ? 200 : 201).json({
      ...result.order,
      duplicate: result.duplicate,
    });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return res.status(400).json({
        message: error.message,
        code: error.code,
      });
    }

    if (error instanceof OrderConflictError) {
      return res.status(409).json({
        message: error.message,
        code: error.code,
      });
    }

    console.error('Error al registrar el pedido:', error.message);

    return res.status(500).json({
      message: 'No se pudo registrar el pedido.',
    });
  }
}

module.exports = {
  postOrder,
};
