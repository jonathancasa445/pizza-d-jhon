import { useCallback, useEffect, useState } from 'react';
import { getMenu } from '../services/menuApi';

export function useMenu() {
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadMenu() {
      setLoading(true);
      setError('');

      try {
        const data = await getMenu();

        if (!cancelled) {
          setMenu(data);
        }
      } catch (loadError) {
        console.error('Error al obtener el menú:', loadError);

        if (!cancelled) {
          setError('No fue posible cargar el menú.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMenu();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const retry = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return {
    menu,
    loading,
    error,
    retry,
  };
}
