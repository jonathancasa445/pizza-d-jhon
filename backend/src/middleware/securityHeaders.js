function createSecurityHeaders(headers) {
  const entries = Object.entries(headers ?? {});

  return function securityHeaders(req, res, next) {
    for (const [name, value] of entries) {
      res.setHeader(name, value);
    }

    next();
  };
}

module.exports = { createSecurityHeaders };
