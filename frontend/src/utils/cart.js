import { dollarsToCents } from './money.js';

export function getCartItemId(item, index = 0) {
  if (item && typeof item === 'object') {
    if (typeof item.id === 'string' && item.id) {
      return item.id;
    }

    if (
      typeof item.configurationKey === 'string' &&
      item.configurationKey
    ) {
      return item.configurationKey;
    }

    if (item._id != null) {
      return String(item._id);
    }
  }

  return `cart-item-${index}`;
}

export function getCartItemQuantity(item) {
  const quantity = Number(item?.quantity);

  return Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
}

export function getCartItemUnitPriceCents(item) {
  if (
    Number.isInteger(item?.unitPriceCents) &&
    item.unitPriceCents >= 0
  ) {
    return item.unitPriceCents;
  }

  return dollarsToCents(item?.price);
}

export function getCartItemLineTotalCents(item) {
  return getCartItemUnitPriceCents(item) * getCartItemQuantity(item);
}

export function getCartCount(cart) {
  if (!Array.isArray(cart)) {
    return 0;
  }

  return cart.reduce(
    (total, item) => total + getCartItemQuantity(item),
    0
  );
}

export function getCartTotalCents(cart) {
  if (!Array.isArray(cart)) {
    return 0;
  }

  return cart.reduce(
    (total, item) => total + getCartItemLineTotalCents(item),
    0
  );
}
