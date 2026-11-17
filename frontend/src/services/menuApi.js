const MENU_URL = 'http://localhost:3000/api/menu';

export async function getMenu() {
  const response = await fetch(MENU_URL);

  if (!response.ok) {
    throw new Error('No se pudo obtener el menú.');
  }

  return response.json();
}
