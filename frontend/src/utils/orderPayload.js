const MAX_ORDER_LINES = 50;
const MAX_ITEM_QUANTITY = 99;
const MAX_NAME_LENGTH = 80;
const MAX_ADDRESS_LENGTH = 200;
const MAX_REFERENCE_LENGTH = 200;
const MAX_OBSERVATIONS_LENGTH = 500;

export const LEGACY_CART_MESSAGE =
  'Tu carrito contiene productos de una versión anterior. Elimínalos y agrégalos nuevamente desde el catálogo actual antes de registrar el pedido.';

function requiredText(value, label, maxLength) {
  if (typeof value !== 'string') {
    throw new Error(`${label} es obligatorio.`);
  }

  const text = value.trim();

  if (!text) {
    throw new Error(`${label} es obligatorio.`);
  }

  if (text.length > maxLength) {
    throw new Error(`${label} no puede superar ${maxLength} caracteres.`);
  }

  return text;
}

function optionalText(value, label, maxLength) {
  if (value == null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new Error(`${label} debe ser texto.`);
  }

  const text = value.trim();

  if (text.length > maxLength) {
    throw new Error(`${label} no puede superar ${maxLength} caracteres.`);
  }

  return text;
}

function readItemQuantity(item, index) {
  const quantity = item.quantity == null ? 1 : item.quantity;

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_ITEM_QUANTITY
  ) {
    throw new Error(
      `La cantidad del producto ${index + 1} debe estar entre 1 y ${MAX_ITEM_QUANTITY}.`
    );
  }

  return quantity;
}

function readFlavors(item, index) {
  if (!item.isMix) {
    return [];
  }

  if (!Array.isArray(item.selectedFlavors)) {
    throw new Error(
      `La pizza Mixta de la línea ${index + 1} no tiene sabores válidos. Elimínala y agrégala nuevamente.`
    );
  }

  const flavors = item.selectedFlavors.map((flavor) => {
    if (!flavor || typeof flavor.key !== 'string' || !flavor.key) {
      throw new Error(
        `La pizza Mixta de la línea ${index + 1} tiene un sabor inválido. Elimínala y agrégala nuevamente.`
      );
    }

    return flavor.key;
  });

  return flavors;
}

function readAddons(item, index) {
  if (item.addons == null) {
    return [];
  }

  if (!Array.isArray(item.addons)) {
    throw new Error(
      `Los adicionales de la línea ${index + 1} no son válidos. Elimínala y agrégala nuevamente.`
    );
  }

  const seenKeys = new Set();

  return item.addons.map((addon) => {
    if (!addon || typeof addon.key !== 'string' || !addon.key) {
      throw new Error(
        `La línea ${index + 1} tiene un adicional inválido. Elimínala y agrégala nuevamente.`
      );
    }

    if (seenKeys.has(addon.key)) {
      throw new Error(
        `La línea ${index + 1} tiene un adicional duplicado. Elimínala y agrégala nuevamente.`
      );
    }

    seenKeys.add(addon.key);

    if (
      !Number.isInteger(addon.quantity) ||
      addon.quantity < 1
    ) {
      throw new Error(
        `La cantidad de un adicional de la línea ${index + 1} no es válida.`
      );
    }

    return {
      key: addon.key,
      quantity: addon.quantity,
    };
  });
}

export function buildOrderRequest(cart, customer) {
  const orderItems = Array.isArray(cart) ? cart : [];

  if (orderItems.length === 0) {
    throw new Error('El carrito está vacío.');
  }

  if (orderItems.length > MAX_ORDER_LINES) {
    throw new Error(
      `No se pueden registrar más de ${MAX_ORDER_LINES} líneas en un pedido.`
    );
  }

  const name = requiredText(
    customer?.name,
    'El nombre del cliente',
    MAX_NAME_LENGTH
  );
  const modality = customer?.modality;

  if (modality !== 'delivery' && modality !== 'pickup') {
    throw new Error('Selecciona Domicilio o Retiro en el local.');
  }

  const address =
    modality === 'delivery'
      ? requiredText(
          customer?.address,
          'La dirección',
          MAX_ADDRESS_LENGTH
        )
      : '';

  const reference = optionalText(
    customer?.reference,
    'La referencia',
    MAX_REFERENCE_LENGTH
  );
  const observations = optionalText(
    customer?.observations,
    'Las observaciones',
    MAX_OBSERVATIONS_LENGTH
  );

  const items = orderItems.map((item, index) => {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.productKey !== 'string' ||
      !item.productKey ||
      typeof item.presentationKey !== 'string' ||
      !item.presentationKey
    ) {
      throw new Error(LEGACY_CART_MESSAGE);
    }

    return {
      productKey: item.productKey,
      presentationKey: item.presentationKey,
      quantity: readItemQuantity(item, index),
      flavors: readFlavors(item, index),
      addons: readAddons(item, index),
    };
  });

  return {
    customer: { name },
    modality,
    address,
    reference,
    observations,
    items,
  };
}
