const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

function createRateLimit({
  windowMs = DEFAULT_WINDOW_MS,
  max = 5,
  keyPrefix = 'rate-limit',
  message = 'Demasiadas solicitudes. Inténtalo más tarde.',
  code = 'RATE_LIMITED',
} = {}) {
  const hits = new Map();

  const sweep = setInterval(() => {
    const now = Date.now();

    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, windowMs);

  sweep.unref?.();

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const username = req.body?.username;
    const identity =
      typeof username === 'string' && username.trim()
        ? `${ip}:${username.trim().toLowerCase()}`
        : ip;
    const key = `${keyPrefix}:${identity}`;

    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      return res.status(429).json({ message, code });
    }

    return next();
  };
}

module.exports = { createRateLimit };
