import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_STATUSES,
  formatDateTime,
  isTransitionAllowed,
  modalityLabel,
  requiresReason,
  statusLabel,
} from './adminOrders.js';

test('los seis estados y sus etiquetas están disponibles', () => {
  assert.deepEqual([...ORDER_STATUSES], [
    'pending',
    'confirmed',
    'preparing',
    'on_the_way',
    'delivered',
    'cancelled',
  ]);
  assert.equal(statusLabel('on_the_way'), 'En camino');
  assert.equal(statusLabel('legacy-status'), 'Sin clasificar');
  assert.equal(modalityLabel('pickup'), 'Retiro');
  assert.equal(modalityLabel('delivery'), 'Domicilio');
});

test('el motivo se exige al retroceder, salir de terminales y cancelar', () => {
  assert.equal(requiresReason('pending', 'confirmed'), false);
  assert.equal(requiresReason('preparing', 'on_the_way'), false);
  assert.equal(requiresReason('confirmed', 'pending'), true);
  assert.equal(requiresReason('delivered', 'pending'), true);
  assert.equal(requiresReason('cancelled', 'pending'), true);
  assert.equal(requiresReason('pending', 'cancelled'), true);
});

test('retiro no puede pasar a on_the_way y los estados iguales se rechazan', () => {
  assert.equal(isTransitionAllowed('preparing', 'on_the_way', 'delivery'), true);
  assert.equal(isTransitionAllowed('preparing', 'on_the_way', 'pickup'), false);
  assert.equal(isTransitionAllowed('pending', 'pending', 'delivery'), false);
  assert.equal(isTransitionAllowed('pending', 'desconocido', 'delivery'), false);
  assert.equal(isTransitionAllowed('desconocido', 'pending', 'delivery'), false);
});

test('formatDateTime devuelve guion para valores inválidos', () => {
  assert.equal(formatDateTime(undefined), '—');
  assert.equal(formatDateTime('no-fecha'), '—');
  assert.notEqual(formatDateTime('2026-01-01T12:00:00.000Z'), '—');
});
