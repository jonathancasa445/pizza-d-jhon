function sortByOrderThenName(a, b) {
  const orderA = Number.isFinite(a?.order) ? a.order : 0;
  const orderB = Number.isFinite(b?.order) ? b.order : 0;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return String(a?.name ?? '').localeCompare(String(b?.name ?? ''));
}

export function getPresentationVariant(product, presentationKey) {
  if (!product || !Array.isArray(product.variants)) {
    return null;
  }

  const availableVariants = product.variants.filter(
    (variant) =>
      variant &&
      variant.available !== false &&
      Number.isInteger(variant.priceCents) &&
      variant.priceCents >= 0
  );

  if (presentationKey) {
    return (
      availableVariants.find((variant) => variant.key === presentationKey) ??
      null
    );
  }

  return availableVariants[0] ?? null;
}

export function getAvailableAddons(product, addons) {
  if (!product || !Array.isArray(addons)) {
    return [];
  }

  const groupKeys = Array.isArray(product.addonGroupKeys)
    ? product.addonGroupKeys
    : [];

  return addons
    .filter(
      (addon) =>
        addon &&
        addon.available !== false &&
        addon.purchasable !== false &&
        Number.isInteger(addon.priceCents) &&
        addon.priceCents >= 0
    )
    .filter(
      (addon) =>
        groupKeys.length === 0 || groupKeys.includes(addon.groupKey)
    )
    .filter(
      (addon) =>
        !Array.isArray(addon.appliesToKinds) ||
        addon.appliesToKinds.includes(product.kind)
    )
    .slice()
    .sort(sortByOrderThenName);
}

export function getMaxQuantityPerAddon(addon, limits) {
  const globalMax = Number.isInteger(limits?.maxQuantityPerAddon)
    ? limits.maxQuantityPerAddon
    : 3;
  const addonMax = Number.isInteger(addon?.maxQuantity)
    ? addon.maxQuantity
    : globalMax;

  return Math.max(0, Math.min(addonMax, globalMax));
}

export function getMaxAddonUnits(limits) {
  return Number.isInteger(limits?.maxAddonUnitsPerPizza)
    ? limits.maxAddonUnitsPerPizza
    : 10;
}

export function getAddonQuantityTotal(addonQuantities) {
  if (!addonQuantities || typeof addonQuantities !== 'object') {
    return 0;
  }

  return Object.values(addonQuantities).reduce(
    (total, quantity) =>
      total + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0),
    0
  );
}

export function canIncreaseAddon(addon, addonQuantities, limits) {
  if (!addon) {
    return false;
  }

  const currentQuantity =
    Number.isInteger(addonQuantities?.[addon.key]) &&
    addonQuantities[addon.key] > 0
      ? addonQuantities[addon.key]
      : 0;

  return (
    currentQuantity < getMaxQuantityPerAddon(addon, limits) &&
    getAddonQuantityTotal(addonQuantities) < getMaxAddonUnits(limits)
  );
}

export function getAddonSubtotalCents(addons, addonQuantities) {
  if (!Array.isArray(addons)) {
    return 0;
  }

  return addons.reduce((total, addon) => {
    const quantity = Number.isInteger(addonQuantities?.[addon.key])
      ? addonQuantities[addon.key]
      : 0;

    if (
      quantity <= 0 ||
      !Number.isInteger(addon.priceCents) ||
      addon.priceCents < 0
    ) {
      return total;
    }

    return total + addon.priceCents * quantity;
  }, 0);
}

export function getMixFlavorOptions(product, products) {
  if (!product || !Array.isArray(products)) {
    return [];
  }

  const allowedFlavorKeys = Array.isArray(
    product.mixConfig?.allowedFlavorKeys
  )
    ? new Set(product.mixConfig.allowedFlavorKeys)
    : null;

  return products
    .filter(
      (candidate) =>
        candidate &&
        candidate.key !== product.key &&
        candidate.kind === 'pizza' &&
        candidate.isMix !== true &&
        candidate.available !== false &&
        (allowedFlavorKeys === null ||
          allowedFlavorKeys.has(candidate.key))
    )
    .slice()
    .sort(sortByOrderThenName);
}

export function createConfigurationKey({
  productKey,
  presentationKey,
  selectedFlavors = [],
  selectedAddons = [],
}) {
  const flavors = selectedFlavors
    .map((flavor) => flavor.key)
    .sort()
    .join(',');
  const addons = selectedAddons
    .map((addon) => `${addon.key}:${addon.quantity}`)
    .sort()
    .join(',');

  return `${productKey}::${presentationKey}::${flavors}::${addons}`;
}

export function buildCartItem({
  product,
  variant,
  presentationKey,
  selectedFlavors = [],
  addons = [],
  addonQuantities = {},
}) {
  const selectedAddons = addons
    .map((addon) => ({
      key: addon.key,
      name: addon.name,
      priceCents: addon.priceCents,
      quantity: Number.isInteger(addonQuantities[addon.key])
        ? addonQuantities[addon.key]
        : 0,
    }))
    .filter((addon) => addon.quantity > 0);

  const basePriceCents = Number.isInteger(variant?.priceCents)
    ? variant.priceCents
    : 0;
  const addonSubtotalCents = selectedAddons.reduce(
    (total, addon) => total + addon.priceCents * addon.quantity,
    0
  );
  const unitPriceCents = basePriceCents + addonSubtotalCents;
  const flavorSnapshots = selectedFlavors.map((flavor) => ({
    key: flavor.key,
    name: flavor.name,
  }));
  const configurationKey = createConfigurationKey({
    productKey: product.key,
    presentationKey,
    selectedFlavors: flavorSnapshots,
    selectedAddons,
  });

  return {
    id: configurationKey,
    configurationKey,
    productKey: product.key,
    name: product.name,
    imageUrl: product.imageUrl || '',
    presentationKey,
    presentationName: variant?.name || presentationKey || '',
    basePriceCents,
    selectedFlavors: flavorSnapshots,
    addons: selectedAddons,
    unitPriceCents,
    quantity: 1,
    isMix: product.isMix === true,
  };
}
