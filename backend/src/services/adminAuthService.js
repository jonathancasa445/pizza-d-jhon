const jwt = require('jsonwebtoken');

const Admin = require('../models/Admin');
const { normalizeUsername } = require('../constants/admin');
const { verifyPassword } = require('./passwordService');

const INVALID_CREDENTIALS_MESSAGE = 'Credenciales inválidas.';
const SECRET_FIELDS = '+passwordHash +passwordSalt +passwordParams';

class AdminAuthError extends Error {
  constructor(
    message = INVALID_CREDENTIALS_MESSAGE,
    code = 'INVALID_CREDENTIALS',
    statusCode = 401
  ) {
    super(message);
    this.name = 'AdminAuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function invalidCredentials() {
  return new AdminAuthError();
}

function toPublicAdmin(admin) {
  return {
    id: String(admin._id),
    username: admin.username,
  };
}

function isActive(admin) {
  return Boolean(admin) && admin.active !== false && admin.active !== 0;
}

function normalizeLoginInput(username, password) {
  const normalized = normalizeUsername(username);

  if (
    typeof normalized !== 'string' ||
    normalized.length === 0 ||
    typeof password !== 'string' ||
    password.length === 0
  ) {
    throw invalidCredentials();
  }

  return { username: normalized, password };
}

async function findAdminForLogin({ username, AdminModel }) {
  const query = AdminModel.findOne({ username });

  if (query && typeof query.select === 'function') {
    return query.select(SECRET_FIELDS);
  }

  return query;
}

async function authenticate({
  username,
  password,
  secret,
  expiresIn,
  AdminModel = Admin,
  verifier = verifyPassword,
  signToken = jwt.sign,
  now = () => new Date(),
} = {}) {
  const input = normalizeLoginInput(username, password);

  if (typeof secret !== 'string' || !secret) {
    throw new Error('JWT_SECRET no configurado.');
  }

  const admin = await findAdminForLogin({
    username: input.username,
    AdminModel,
  });

  if (!isActive(admin)) {
    throw invalidCredentials();
  }

  const passwordMatches = verifier(input.password, {
    hash: admin.passwordHash,
    salt: admin.passwordSalt,
    params: admin.passwordParams,
  });

  if (!passwordMatches) {
    throw invalidCredentials();
  }

  const token = signToken({ sub: String(admin._id) }, secret, { expiresIn });

  await AdminModel.updateOne(
    { _id: admin._id },
    { $set: { lastLoginAt: now() } }
  );

  return { token, admin: toPublicAdmin(admin) };
}

function decodeToken(token, secret, tokenVerifier = jwt.verify) {
  if (typeof token !== 'string' || !token || typeof secret !== 'string' || !secret) {
    return null;
  }

  try {
    const payload = tokenVerifier(token, secret);

    if (
      !payload ||
      typeof payload !== 'object' ||
      typeof payload.sub !== 'string' ||
      !payload.sub
    ) {
      return null;
    }

    return { id: payload.sub };
  } catch {
    return null;
  }
}

async function resolveAuthenticatedAdmin({
  token,
  secret,
  AdminModel = Admin,
  tokenVerifier = jwt.verify,
} = {}) {
  const identity = decodeToken(token, secret, tokenVerifier);

  if (!identity) {
    return null;
  }

  const admin = await AdminModel.findById(identity.id);

  if (!isActive(admin)) {
    return null;
  }

  return toPublicAdmin(admin);
}

module.exports = {
  AdminAuthError,
  SECRET_FIELDS,
  authenticate,
  decodeToken,
  resolveAuthenticatedAdmin,
  toPublicAdmin,
};
