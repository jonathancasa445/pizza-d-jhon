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
  reference,
  observations,
}) {
  const errors = {};
  const normalizedName = String(name ?? '').trim();

  if (!normalizedName) {
    errors.name = 'Ingresa tu nombre.';
  } else if (normalizedName.length > 80) {
    errors.name = 'El nombre no puede superar 80 caracteres.';
  }

  if (modality !== 'delivery' && modality !== 'pickup') {
    errors.modality = 'Selecciona Domicilio o Retiro en el local.';
  }

  if (modality === 'delivery') {
    const normalizedAddress = String(address ?? '').trim();

    if (!normalizedAddress) {
      errors.address = 'Ingresa la dirección para el domicilio.';
    } else if (normalizedAddress.length > 200) {
      errors.address = 'La dirección no puede superar 200 caracteres.';
    }
  }

  if (String(reference ?? '').trim().length > 200) {
    errors.reference = 'La referencia no puede superar 200 caracteres.';
  }

  if (String(observations ?? '').trim().length > 500) {
    errors.observations =
      'Las observaciones no pueden superar 500 caracteres.';
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

function buildRegisteredItemLines(item, index) {
  const lines = [
    `${index + 1}. ${item?.productName || 'Producto sin nombre'}`,
  ];

  if (item?.presentationName) {
    lines.push(`   Presentación: ${item.presentationName}`);
  }

  const flavors = Array.isArray(item?.flavors) ? item.flavors : [];

  if (flavors.length > 0) {
    const percentage = Math.round(100 / flavors.length);

    lines.push('   Sabores:');
    flavors.forEach((flavor) => {
      lines.push(`   - ${flavor.name} (${percentage} %)`);
    });
  }

  lines.push(`   Cantidad: ${item?.quantity ?? 1}`);

  const addons = Array.isArray(item?.addons) ? item.addons : [];

  if (addons.length > 0) {
    lines.push('   Complementos:');
    addons.forEach((addon) => {
      lines.push(`   - ${addon.name} x${addon.quantity}`);
    });
  }

  lines.push(
    `   Subtotal: ${formatCents(item?.lineTotalCents)}`
  );

  return lines.join('\n');
}

export function buildRegisteredOrderMessage(order) {
  const orderItems = Array.isArray(order?.items) ? order.items : [];
  const modality = order?.modality;
  const lines = [
    "Hola, registré mi pedido en Pizza D' Jhon.",
    '',
    `PEDIDO: ${order?.orderId || ''}`,
    `ESTADO: ${order?.status || 'pending'}`,
    '',
    'CLIENTE:',
    order?.customer?.name || '',
    '',
    'MODALIDAD:',
    getModalityLabel(modality),
  ];

  if (modality === 'delivery') {
    lines.push('', 'DIRECCIÓN:', order?.address || '');
  }

  if (order?.reference) {
    lines.push('', 'REFERENCIA:', order.reference);
  }

  if (order?.observations) {
    lines.push('', 'OBSERVACIONES:', order.observations);
  }

  lines.push('', 'PEDIDO:', '');

  orderItems.forEach((item, index) => {
    lines.push(buildRegisteredItemLines(item, index), '');
  });

  lines.push(
    `TOTAL CALCULADO POR EL SERVIDOR: ${formatCents(
      order?.totalCents
    )}`,
    '',
    'El pedido queda pendiente de confirmación.'
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
