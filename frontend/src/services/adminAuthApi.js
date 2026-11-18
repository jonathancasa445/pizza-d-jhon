import { adminFetch, createApiError } from './adminApi.js';
import { csrfRequest, resetCsrfToken } from './adminCsrf.js';

function readAdmin(data) {
  if (typeof data?.admin?.id !== 'string' || typeof data.admin.username !== 'string') {
    throw createApiError('El servidor devolvió una sesión inválida.', {
      status: 200,
      code: 'INVALID_SESSION_RESPONSE',
    });
  }

  return data.admin;
}

export async function login({ username, password }) {
  const data = await csrfRequest('/api/admin/auth/login', {
    method: 'POST',
    body: { username, password },
  });

  return readAdmin(data);
}

export async function getSession() {
  const data = await adminFetch('/api/admin/auth/me');

  return readAdmin(data);
}

export async function logout() {
  try {
    return await csrfRequest('/api/admin/auth/logout', { method: 'POST' });
  } finally {
    resetCsrfToken();
  }
}

export { resetCsrfToken };
