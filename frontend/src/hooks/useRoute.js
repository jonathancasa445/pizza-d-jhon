import { useSyncExternalStore } from 'react';
import { matchRoute, normalizePath } from '../router';

function subscribe(onChange) {
  window.addEventListener('popstate', onChange);
  window.addEventListener('hashchange', onChange);

  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener('hashchange', onChange);
  };
}

function getSnapshot() {
  return normalizePath(window.location.pathname);
}

export function useRoute() {
  const path = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return matchRoute(path);
}
