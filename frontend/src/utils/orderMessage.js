import {
  getCartItemLineTotalCents,
  getCartItemQuantity,
  getCartTotalCents,
} from './cart';
import { formatCents } from './money';

const MODALITY_LABELS = {
  delivery: 'Domicilio',
  pickup: 'Retiro en el local',
};

export function getModalityLabel(modality) {
  return MODALITY_LABELS[modality] ?? '';
}

export function validateOrderForm({
  name,
  modality,
  address,
}) {
  const errors = {};

  if (!String(name ?? '').trim()) {
    errors.name = 'Ingresa tu nombre.';
  }

  if (modality !== 'delivery' && modality !== 'pickup') {
    errors.modality = 'Selecciona Domicilio o Retiro en el local.';
  }

  if (
    modality === 'delivery' &&
    !String(address ?? '').trim()
  ) {
    errors.address = 'Ingresa la dirección para el domicilio.';
  }

  return errors;
}

function buildItemLines(item, index) {
  const lines = [
    `${index + 1}. ${item?.name || 'Producto sin nombre'}`,
  ];

  if (item?.presentationName) {
    lines.push(`   Presentación: ${item.presentationName}`);
  }

  const flavors = Array.isArray(item?.selectedFlavors)
    ? item.selectedFlavors
    : [];

  if (flavors.length > 0) {
    const percentage = Math.round(100 / flavors.length);

    lines.push('   Sabores:');
    flavors.forEach((flavor) => {
      lines.push(`   - ${flavor.name} (${percentage} %)`);
    });
  }

  lines.push(`   Cantidad: ${getCartItemQuantity(item)}`);

  const addons = Array.isArray(item?.addons) ? item.addons : [];

  if (addons.length > 0) {
    lines.push('   Complementos:');
    addons.forEach((addon) => {
      lines.push(`   - ${addon.name} x${addon.quantity}`);
    });
  }

  lines.push(
    `   Subtotal: ${formatCents(getCartItemLineTotalCents(item))}`
  );

  return lines.join('\n');
}

export function buildOrderMessage({ cart, customer }) {
  const orderItems = Array.isArray(cart) ? cart : [];
  const name = String(customer?.name ?? '').trim();
  const modality = customer?.modality;
  const modalityLabel = getModalityLabel(modality);
  const address = String(customer?.address ?? '').trim();
  const reference = String(customer?.reference ?? '').trim();
  const observations = String(customer?.observations ?? '').trim();
  const lines = [
    "Hola, quisiera realizar un pedido en Pizza D' Jhon.",
    '',
    'CLIENTE:',
    name,
    '',
    'MODALIDAD:',
    modalityLabel,
  ];

  if (modality === 'delivery') {
    lines.push('', 'DIRECCIÓN:', address);
  }

  if (reference) {
    lines.push('', 'REFERENCIA:', reference);
  }

  lines.push('', 'PEDIDO:', '');

  orderItems.forEach((item, index) => {
    lines.push(buildItemLines(item, index), '');
  });

  lines.push(
    `TOTAL DEL PEDIDO: ${formatCents(getCartTotalCents(orderItems))}`
  );

  if (observations) {
    lines.push('', 'OBSERVACIONES:', observations);
  }

  lines.push(
    '',
    '¡Quedo pendiente de la confirmación de mi pedido!'
  );

  return lines.join('\n').trim();
}

export function buildWhatsAppUrl(phone, message) {
  const normalizedPhone = String(phone ?? '').replace(/\D/g, '');

  if (!/^\d{8,15}$/.test(normalizedPhone)) {
    return null;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
    message
  )}`;
}
