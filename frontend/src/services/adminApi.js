import { apiUrl } from '../config/api.js';

function createApiError(message, { status, code } = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;

  return error;
}

export async function adminFetch(
  path,
  { method = 'GET', body, csrfToken } = {}
) {
  const headers = { Accept: 'application/json' };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  let response;

  try {
    response = await fetch(apiUrl(path), {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw createApiError(
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
    throw createApiError(
      data?.message || 'No se pudo completar la solicitud. Inténtalo de nuevo.',
      { status: response.status, code: data?.code }
    );
  }

  return data;
}

export { createApiError };
