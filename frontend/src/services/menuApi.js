const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(
  /\/$/,
  ''
);
const MENU_URL = `${API_BASE_URL}/api/menu`;

export async function getMenu() {
  const response = await fetch(MENU_URL);

  if (!response.ok) {
    throw new Error('No se pudo obtener el menú.');
  }

  return response.json();
}
