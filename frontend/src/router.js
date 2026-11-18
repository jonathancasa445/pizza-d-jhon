export function normalizePath(pathname) {
  const path = typeof pathname === 'string' ? pathname : '/';
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  const withoutTrailing = withSlash.replace(/\/+$/, '');

  return withoutTrailing || '/';
}

export function matchRoute(pathname) {
  const path = normalizePath(pathname);

  if (path === '/') {
    return { name: 'public', path };
  }

  if (path === '/admin/login') {
    return { name: 'adminLogin', path };
  }

  if (path === '/admin') {
    return { name: 'admin', path };
  }

  return { name: 'notFound', path };
}

export function navigate(to, { replace = false } = {}) {
  const target = new URL(to, window.location.href);

  if (target.origin !== window.location.origin) {
    window.location.assign(target.href);
    return;
  }

  const nextUrl = `${target.pathname}${target.search}${target.hash}`;

  if (replace) {
    window.history.replaceState(null, '', nextUrl);
  } else {
    window.history.pushState(null, '', nextUrl);
  }

  window.dispatchEvent(new PopStateEvent('popstate'));
}
