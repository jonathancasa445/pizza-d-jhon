// Base de la API: VITE_API_BASE_URL o rutas relativas /api (proxy de Vite/Netlify).
const rawBaseUrl = import.meta.env?.VITE_API_BASE_URL ?? '';

export const API_BASE_URL = String(rawBaseUrl).replace(/\/$/, '');

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
