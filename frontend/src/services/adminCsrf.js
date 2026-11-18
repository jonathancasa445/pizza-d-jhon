import { adminFetch, createApiError } from './adminApi.js';

// El token CSRF vive solo en memoria: nunca en localStorage/sessionStorage.
let csrfToken = null;

export function resetCsrfToken() {
  csrfToken = null;
}

export function getCsrfToken() {
  return csrfToken;
}

export async function ensureCsrfToken({ force = false } = {}) {
  if (csrfToken && !force) {
    return csrfToken;
  }

  const data = await adminFetch('/api/admin/auth/csrf');

  if (typeof data?.csrfToken !== 'string' || !data.csrfToken) {
    throw createApiError('No se pudo iniciar la sesión segura. Inténtalo de nuevo.', {
      code: 'INVALID_CSRF_RESPONSE',
    });
  }

  csrfToken = data.csrfToken;

  return csrfToken;
}

export async function csrfRequest(path, options = {}) {
  let token = await ensureCsrfToken();

  try {
    return await adminFetch(path, { ...options, csrfToken: token });
  } catch (error) {
    if (error.status !== 403 || error.code !== 'CSRF_INVALID') {
      throw error;
    }

    resetCsrfToken();
    token = await ensureCsrfToken({ force: true });

    return adminFetch(path, { ...options, csrfToken: token });
  }
}
