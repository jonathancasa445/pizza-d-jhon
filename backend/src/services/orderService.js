const crypto = require('node:crypto');
const Order = require('../models/Order');
const {
  getPublicMenu,
  isValidProductKey,
} = require('./menuService');
const {
  MAX_ADDON_QUANTITY_PER_ADDON,
  MAX_ADDON_UNITS_PER_PIZZA,
} = require('../constants/catalog');
const {
  ORDER_MODALITIES,
  ORDER_CURRENCY,
  MAX_ORDER_ITEMS,
  MAX_ORDER_ITEM_QUANTITY,
  MAX_CUSTOMER_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
  MAX_REFERENCE_LENGTH,
  MAX_OBSERVATIONS_LENGTH,
  UUID_V4_PATTERN,
} = require('../constants/order');

class OrderValidationError extends Error {
  constructor(message, code = 'ORDER_VALIDATION_ERROR') {
    super(message);
    this.name = 'OrderValidationError';
    this.statusCode = 400;
    this.code = code;
  }
}

class OrderConflictError extends Error {
  constructor(
    message = 'La clave de idempotencia ya fue utilizada con un pedido diferente.'
  ) {
    super(message);
    this.name = 'OrderConflictError';
    this.statusCode = 409;
    this.code = 'IDEMPOTENCY_CONFLICT';
  }
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function assertObject(value, label) {
  if (!isPlainObject(value)) {
    throw new OrderValidationError(`${label} debe ser un objeto.`);
  }
}

function assertOnlyKeys(value, allowedKeys, label) {
  assertObject(value, label);

  for (const key of Object.keys(value)) {
    if (allowedKeys.includes(key)) {
      continue;
    }

    if (/(price|total|subtotal|amount|cents)/i.test(key)) {
      throw new OrderValidationError(
        `No se permite enviar el campo monetario "${key}" en ${label}.`
      );
    }

    throw new OrderValidationError(
      `El campo "${key}" no está permitido en ${label}.`
    );
  }
}

function readRequiredString(value, label, maxLength) {
  if (typeof value !== 'string') {
    throw new OrderValidationError(`${label} es obligatorio.`);
  }

  const text = value.trim();

  if (!text) {
    throw new OrderValidationError(`${label} es obligatorio.`);
  }

  if (text.length > maxLength) {
    throw new OrderValidationError(
      `${label} no puede superar ${maxLength} caracteres.`
    );
  }

  return text;
}

function readOptionalString(value, label, maxLength) {
  if (value == null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new OrderValidationError(`${label} debe ser texto.`);
  }

  const text = value.trim();

  if (text.length > maxLength) {
    throw new OrderValidationError(
      `${label} no puede superar ${maxLength} caracteres.`
    );
  }

  return text;
}

function readKey(value, label) {
  if (typeof value !== 'string' || !isValidProductKey(value.trim())) {
    throw new OrderValidationError(`${label} no es válido.`);
  }

  return value.trim();
}

function readInteger(value, label, min, max) {
  if (!Number.isInteger(value)) {
    throw new OrderValidationError(`${label} debe ser un entero.`);
  }

  if (value < min || value > max) {
    throw new OrderValidationError(
      `${label} debe estar entre ${min} y ${max}.`
    );
  }

  return value;
}

function assertSafeCents(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new OrderValidationError(
      `${label} debe ser un importe entero seguro y no negativo.`
    );
  }

  return value;
}

function validateIdempotencyKey(value) {
  const key = typeof value === 'string' ? value.trim() : '';

  if (!UUID_V4_PATTERN.test(key)) {
    throw new OrderValidationError(
      'La cabecera Idempotency-Key debe contener un UUID v4 válido.'
    );
  }

  return key;
}

function validateCustomerData(payload) {
  assertOnlyKeys(
    payload,
    [
      'customer',
      'modality',
      'address',
      'reference',
      'observations',
      'items',
    ],
    'el pedido'
  );

  assertOnlyKeys(payload.customer, ['name'], 'customer');

  const name = readRequiredString(
    payload.customer.name,
    'El nombre del cliente',
    MAX_CUSTOMER_NAME_LENGTH
  );

  if (!ORDER_MODALITIES.includes(payload.modality)) {
    throw new OrderValidationError(
      'La modalidad debe ser "delivery" o "pickup".'
    );
  }

  const modality = payload.modality;
  const address =
    modality === 'delivery'
      ? readRequiredString(
          payload.address,
          'La dirección',
          MAX_ADDRESS_LENGTH
        )
      : '';

  const reference = readOptionalString(
    payload.reference,
    'La referencia',
    MAX_REFERENCE_LENGTH
  );
  const observations = readOptionalString(
    payload.observations,
    'Las observaciones',
    MAX_OBSERVATIONS_LENGTH
  );

  if (!Array.isArray(payload.items)) {
    throw new OrderValidationError('Los productos del pedido son obligatorios.');
  }

  if (payload.items.length === 0) {
    throw new OrderValidationError(
      'El pedido debe contener al menos un producto.'
    );
  }

  if (payload.items.length > MAX_ORDER_ITEMS) {
    throw new OrderValidationError(
      `El pedido no puede contener más de ${MAX_ORDER_ITEMS} líneas.`
    );
  }

  return {
    customer: { name },
    modality,
    address,
    reference,
    observations,
    items: payload.items,
  };
}

function resolveVariant(product, presentationKey) {
  const variants = Array.isArray(product.variants)
    ? product.variants
    : [];
  let resolvedKey =
    typeof presentationKey === 'string' ? presentationKey.trim() : '';

  if (!resolvedKey && product.kind === 'simple' && variants.length === 1) {
    resolvedKey = variants[0]?.key ?? '';
  }

  if (!resolvedKey) {
    throw new OrderValidationError(
      `La presentación de "${product.name}" es obligatoria.`
    );
  }

  const variant = variants.find(
    (candidate) =>
      candidate &&
      candidate.key === resolvedKey &&
      candidate.available !== false &&
      Number.isSafeInteger(candidate.priceCents) &&
      candidate.priceCents >= 0
  );

  if (!variant) {
    throw new OrderValidationError(
      `La presentación "${resolvedKey}" no está disponible para "${product.name}".`
    );
  }

  assertSafeCents(variant.priceCents, 'El precio de la presentación');

  return variant;
}

function validateFlavors(product, rawFlavors, productsByKey) {
  if (rawFlavors == null) {
    return [];
  }

  if (!Array.isArray(rawFlavors)) {
    throw new OrderValidationError('Los sabores deben enviarse como una lista.');
  }

  const flavorKeys = rawFlavors.map((flavorKey) =>
    readKey(flavorKey, 'El sabor')
  );

  if (!product.isMix) {
    if (flavorKeys.length > 0) {
      throw new OrderValidationError(
        `"${product.name}" no admite selección de sabores.`
      );
    }

    return [];
  }

  if (flavorKeys.length !== 2) {
    throw new OrderValidationError(
      'La pizza Mixta debe tener exactamente dos sabores.'
    );
  }

  if (new Set(flavorKeys).size !== 2) {
    throw new OrderValidationError(
      'Los dos sabores de la pizza Mixta deben ser diferentes.'
    );
  }

  const allowedFlavorKeys = Array.isArray(
    product.mixConfig?.allowedFlavorKeys
  )
    ? new Set(product.mixConfig.allowedFlavorKeys)
    : null;

  return flavorKeys.map((flavorKey) => {
    if (flavorKey === product.key) {
      throw new OrderValidationError(
        'La pizza Mixta no puede seleccionarse como uno de sus sabores.'
      );
    }

    if (allowedFlavorKeys && !allowedFlavorKeys.has(flavorKey)) {
      throw new OrderValidationError(
        `El sabor "${flavorKey}" no está permitido para la pizza Mixta.`
      );
    }

    const flavorProduct = productsByKey.get(flavorKey);

    if (!flavorProduct || flavorProduct.available === false) {
      throw new OrderValidationError(
        `El sabor "${flavorKey}" no está disponible.`
      );
    }

    if (flavorProduct.kind !== 'pizza' || flavorProduct.isMix === true) {
      throw new OrderValidationError(
        `El producto "${flavorKey}" no puede usarse como sabor de la pizza Mixta.`
      );
    }

    return {
      key: flavorProduct.key,
      name: flavorProduct.name,
    };
  });
}

function validateAddons(product, rawAddons, addonsByKey, itemLabel) {
  if (rawAddons == null) {
    return {
      addons: [],
      addonsSubtotalCents: 0,
    };
  }

  if (!Array.isArray(rawAddons)) {
    throw new OrderValidationError(
      `Los adicionales de ${itemLabel} deben enviarse como una lista.`
    );
  }

  const seenKeys = new Set();
  const addons = [];
  let addonsSubtotalCents = 0;
  let addonUnits = 0;

  for (let index = 0; index < rawAddons.length; index += 1) {
    const rawAddon = rawAddons[index];
    const addonLabel = `${itemLabel} adicional ${index + 1}`;

    assertOnlyKeys(rawAddon, ['key', 'quantity'], addonLabel);

    const key = readKey(rawAddon.key, `La clave de ${addonLabel}`);

    if (seenKeys.has(key)) {
      throw new OrderValidationError(
        `El adicional "${key}" está duplicado en ${itemLabel}.`
      );
    }

    seenKeys.add(key);

    const addon = addonsByKey.get(key);

    if (!addon || addon.available === false) {
      throw new OrderValidationError(
        `El adicional "${key}" no está disponible.`
      );
    }

    if (
      addon.purchasable === false ||
      !Number.isSafeInteger(addon.priceCents) ||
      addon.priceCents < 0
    ) {
      throw new OrderValidationError(
        `El adicional "${key}" no tiene un precio válido.`
      );
    }

    const productAddonGroups = Array.isArray(product.addonGroupKeys)
      ? product.addonGroupKeys
      : [];

    if (!productAddonGroups.includes(addon.groupKey)) {
      throw new OrderValidationError(
        `El adicional "${key}" no aplica a "${product.name}".`
      );
    }

    if (
      Array.isArray(addon.appliesToKinds) &&
      !addon.appliesToKinds.includes(product.kind)
    ) {
      throw new OrderValidationError(
        `El adicional "${key}" no aplica al tipo de producto "${product.name}".`
      );
    }

    const configuredMax = Number.isInteger(addon.maxQuantity)
      ? addon.maxQuantity
      : MAX_ADDON_QUANTITY_PER_ADDON;
    const maxQuantity = Math.min(
      configuredMax,
      MAX_ADDON_QUANTITY_PER_ADDON
    );

    const quantity = readInteger(
      rawAddon.quantity,
      `La cantidad de ${addonLabel}`,
      1,
      maxQuantity
    );

    addonUnits += quantity;

    if (addonUnits > MAX_ADDON_UNITS_PER_PIZZA) {
      throw new OrderValidationError(
        `Los adicionales de ${itemLabel} superan el máximo de ${MAX_ADDON_UNITS_PER_PIZZA} unidades por pizza.`
      );
    }

    const addonSubtotal = addon.priceCents * quantity;

    assertSafeCents(addonSubtotal, `El subtotal de ${addonLabel}`);
    addonsSubtotalCents = assertSafeCents(
      addonsSubtotalCents + addonSubtotal,
      `El subtotal de adicionales de ${itemLabel}`
    );

    addons.push({
      key: addon.key,
      name: addon.name,
      priceCents: addon.priceCents,
      quantity,
    });
  }

  return {
    addons,
    addonsSubtotalCents,
  };
}

function validateAndPriceOrder(payload, menu) {
  const customerData = validateCustomerData(payload);
  const products = Array.isArray(menu?.products) ? menu.products : [];
  const addons = Array.isArray(menu?.addons) ? menu.addons : [];
  const productsByKey = new Map(
    products.map((product) => [product.key, product])
  );
  const addonsByKey = new Map(
    addons.map((addon) => [addon.key, addon])
  );
  const orderItems = [];
  const normalizedItems = [];
  let subtotalCents = 0;

  customerData.items.forEach((rawItem, index) => {
    const itemLabel = `La línea ${index + 1}`;

    assertOnlyKeys(
      rawItem,
      ['productKey', 'presentationKey', 'quantity', 'flavors', 'addons'],
      itemLabel
    );

    const productKey = readKey(
      rawItem.productKey,
      `La clave de producto de ${itemLabel}`
    );
    const product = productsByKey.get(productKey);

    if (!product || product.available === false) {
      throw new OrderValidationError(
        `El producto "${productKey}" no está disponible.`
      );
    }

    const variant = resolveVariant(product, rawItem.presentationKey);
    const quantity = readInteger(
      rawItem.quantity,
      `La cantidad de ${itemLabel}`,
      1,
      MAX_ORDER_ITEM_QUANTITY
    );
    const flavors = validateFlavors(
      product,
      rawItem.flavors,
      productsByKey
    );
    const addonResult = validateAddons(
      product,
      rawItem.addons,
      addonsByKey,
      itemLabel
    );

    const basePriceCents = assertSafeCents(
      variant.priceCents,
      `El precio base de ${itemLabel}`
    );
    const unitPriceCents = assertSafeCents(
      basePriceCents + addonResult.addonsSubtotalCents,
      `El precio unitario de ${itemLabel}`
    );
    const lineTotalCents = assertSafeCents(
      unitPriceCents * quantity,
      `El subtotal de ${itemLabel}`
    );

    subtotalCents = assertSafeCents(
      subtotalCents + lineTotalCents,
      'El subtotal del pedido'
    );

    orderItems.push({
      productKey: product.key,
      productName: product.name,
      presentationKey: variant.key,
      presentationName: variant.name || variant.key,
      basePriceCents,
      addonsSubtotalCents: addonResult.addonsSubtotalCents,
      unitPriceCents,
      quantity,
      lineTotalCents,
      isMix: product.isMix === true,
      flavors,
      addons: addonResult.addons,
    });

    normalizedItems.push({
      productKey: product.key,
      presentationKey: variant.key,
      quantity,
      flavors: flavors.map((flavor) => flavor.key).sort(),
      addons: addonResult.addons
        .map((addon) => ({
          key: addon.key,
          quantity: addon.quantity,
        }))
        .sort((a, b) => a.key.localeCompare(b.key)),
    });
  });

  const totalCents = subtotalCents;

  normalizedItems.sort((a, b) => {
    const aKey = `${a.productKey}::${a.presentationKey}::${a.flavors.join(
      ','
    )}::${JSON.stringify(a.addons)}`;
    const bKey = `${b.productKey}::${b.presentationKey}::${b.flavors.join(
      ','
    )}::${JSON.stringify(b.addons)}`;

    return aKey.localeCompare(bKey);
  });

  return {
    orderData: {
      customer: customerData.customer,
      modality: customerData.modality,
      address: customerData.address,
      reference: customerData.reference,
      observations: customerData.observations,
      items: orderItems,
      subtotalCents,
      totalCents,
      currency: ORDER_CURRENCY,
      status: 'pending',
    },

    normalizedRequest: {
      customer: customerData.customer,
      modality: customerData.modality,
      address: customerData.address,
      reference: customerData.reference,
      observations: customerData.observations,
      items: normalizedItems,
    },
  };
}

function hashNormalizedRequest(normalizedRequest) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(normalizedRequest))
    .digest('hex');
}

function serializeOrder(order) {
  const plainOrder =
    order && typeof order.toObject === 'function'
      ? order.toObject({
          virtuals: false,
          versionKey: false,
        })
      : order;

  if (!plainOrder) {
    throw new Error('No se pudo serializar el pedido.');
  }

  return {
    orderId: String(plainOrder._id),
    status: plainOrder.status,
    currency: plainOrder.currency,
    createdAt: plainOrder.createdAt,
    customer: {
      name: plainOrder.customer?.name ?? '',
    },
    modality: plainOrder.modality,
    address: plainOrder.address ?? '',
    reference: plainOrder.reference ?? '',
    observations: plainOrder.observations ?? '',
    items: (plainOrder.items ?? []).map((item) => ({
      productKey: item.productKey,
      productName: item.productName,
      presentationKey: item.presentationKey,
      presentationName: item.presentationName,
      basePriceCents: item.basePriceCents,
      addonsSubtotalCents: item.addonsSubtotalCents,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
      isMix: item.isMix === true,
      flavors: (item.flavors ?? []).map((flavor) => ({
        key: flavor.key,
        name: flavor.name,
      })),
      addons: (item.addons ?? []).map((addon) => ({
        key: addon.key,
        name: addon.name,
        priceCents: addon.priceCents,
        quantity: addon.quantity,
      })),
    })),
    subtotalCents: plainOrder.subtotalCents,
    totalCents: plainOrder.totalCents,
  };
}

function resolveExistingOrder(existingOrder, requestHash) {
  if (existingOrder.requestHash !== requestHash) {
    throw new OrderConflictError();
  }

  return {
    order: serializeOrder(existingOrder),
    duplicate: true,
  };
}

const orderRepository = {
  async findByIdempotencyKey(idempotencyKey) {
    return Order.findOne({ idempotencyKey }).lean();
  },

  async create(orderData) {
    const order = await Order.create(orderData);

    return typeof order.toObject === 'function'
      ? order.toObject({ virtuals: false, versionKey: false })
      : order;
  },
};

async function createOrder({
  payload,
  idempotencyKey,
  menuLoader = getPublicMenu,
  repository = orderRepository,
}) {
  const normalizedKey = validateIdempotencyKey(idempotencyKey);
  const menu = await menuLoader();
  const { orderData, normalizedRequest } = validateAndPriceOrder(
    payload,
    menu
  );
  const requestHash = hashNormalizedRequest(normalizedRequest);
  const existingOrder = await repository.findByIdempotencyKey(
    normalizedKey
  );

  if (existingOrder) {
    return resolveExistingOrder(existingOrder, requestHash);
  }

  try {
    const createdOrder = await repository.create({
      idempotencyKey: normalizedKey,
      requestHash,
      ...orderData,
    });

    return {
      order: serializeOrder(createdOrder),
      duplicate: false,
    };
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateOrder = await repository.findByIdempotencyKey(
        normalizedKey
      );

      if (duplicateOrder) {
        return resolveExistingOrder(duplicateOrder, requestHash);
      }
    }

    throw error;
  }
}

module.exports = {
  OrderConflictError,
  OrderValidationError,
  createOrder,
  hashNormalizedRequest,
  orderRepository,
  serializeOrder,
  validateAndPriceOrder,
  validateIdempotencyKey,
};
