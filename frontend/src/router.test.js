import test from 'node:test';
import assert from 'node:assert/strict';
import { matchRoute, normalizePath } from './router.js';

test('normalizePath elimina barras finales y garantiza la raíz', () => {
  assert.equal(normalizePath('/'), '/');
  assert.equal(normalizePath('/admin/'), '/admin');
  assert.equal(normalizePath('///'), '/');
  assert.equal(normalizePath('admin/login'), '/admin/login');
});

test('matchRoute reconoce las tres rutas de la Etapa 5', () => {
  assert.deepEqual(matchRoute('/'), {
    name: 'public',
    path: '/',
  });
  assert.deepEqual(matchRoute('/admin'), {
    name: 'admin',
    path: '/admin',
  });
  assert.deepEqual(matchRoute('/admin/login'), {
    name: 'adminLogin',
    path: '/admin/login',
  });
  assert.equal(matchRoute('/admin/orders').name, 'notFound');
});
