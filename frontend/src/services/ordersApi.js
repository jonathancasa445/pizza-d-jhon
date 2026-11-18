const ORDERS_URL = 'http://localhost:3000/api/orders';

function createRequestError(message, { status, code } = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;

  return error;
}

export async function createOrder({ payload, idempotencyKey }) {
  let response;

  try {
    response = await fetch(ORDERS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw createRequestError(
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      { code: 'NETWORK_ERROR' }
    );
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw createRequestError(
      data?.message || 'No se pudo registrar el pedido. Inténtalo de nuevo.',
      {
        status: response.status,
        code: data?.code,
      }
    );
  }

  if (
    !data ||
    typeof data.orderId !== 'string' ||
    !Number.isInteger(data.totalCents)
  ) {
    throw createRequestError(
      'El servidor devolvió una confirmación inválida. Inténtalo de nuevo.',
      { status: response.status, code: 'INVALID_ORDER_RESPONSE' }
    );
  }

  return data;
}
