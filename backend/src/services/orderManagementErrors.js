class OrderManagementError extends Error {
  constructor(message, code = 'ORDER_MANAGEMENT_ERROR', statusCode = 400) {
    super(message);
    this.name = 'OrderManagementError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

module.exports = { OrderManagementError };
