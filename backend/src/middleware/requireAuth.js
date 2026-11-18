function createRequireAuth({ cookieName, resolveAdmin }) {
  return async function requireAuth(req, res, next) {
    const token = req.cookies?.[cookieName];
    let admin = null;

    try {
      admin = await resolveAdmin(token);
    } catch {
      admin = null;
    }

    if (!admin) {
      return res.status(401).json({
        message: 'No autenticado.',
        code: 'ADMIN_UNAUTHENTICATED',
      });
    }

    req.admin = admin;

    return next();
  };
}

module.exports = { createRequireAuth };
