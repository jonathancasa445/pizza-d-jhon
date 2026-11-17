const Product = require('../models/Product');
const MenuSection = require('../models/MenuSection');
const Addon = require('../models/Addon');
const {
  PIZZA_ADDON_GROUP_KEY,
  MAX_ADDON_QUANTITY_PER_ADDON,
  MAX_ADDON_UNITS_PER_PIZZA,
} = require('../constants/catalog');

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toPlain(value) {
  if (value == null) {
    return value;
  }

  if (typeof value.toObject === 'function') {
    return value.toObject({
      virtuals: false,
      versionKey: false,
    });
  }

  return value;
}

function isValidProductKey(key) {
  return (
    typeof key === 'string' &&
    key.length > 0 &&
    key.length <= 80 &&
    KEY_PATTERN.test(key)
  );
}

function isPricedVariant(variant) {
  return (
    variant &&
    variant.available !== false &&
    Number.isInteger(variant.priceCents) &&
    variant.priceCents >= 0
  );
}

function getPricedVariants(product) {
  const plainProduct = toPlain(product);

  if (!plainProduct || !Array.isArray(plainProduct.variants)) {
    return [];
  }

  return plainProduct.variants.filter(isPricedVariant);
}

function getVariantForSection(product, section) {
  const plainProduct = toPlain(product);
  const plainSection = toPlain(section);

  if (
    !plainProduct ||
    !plainSection ||
    plainSection.kind !== 'pizza-presentation'
  ) {
    return null;
  }

  const variants = Array.isArray(plainProduct.variants)
    ? plainProduct.variants
    : [];

  return (
    variants.find(
      (variant) =>
        variant.key === plainSection.presentationKey &&
        isPricedVariant(variant)
    ) || null
  );
}

function getStartingPriceCents(products, section) {
  const plainSection = toPlain(section);
  const prices = [];

  for (const product of products) {
    if (plainSection.kind === 'pizza-presentation') {
      const variant = getVariantForSection(product, plainSection);

      if (variant) {
        prices.push(variant.priceCents);
      }

      continue;
    }

    for (const variant of getPricedVariants(product)) {
      prices.push(variant.priceCents);
    }
  }

  if (prices.length === 0) {
    return null;
  }

  return Math.min(...prices);
}

function productBelongsToSection(product, section) {
  const plainProduct = toPlain(product);
  const plainSection = toPlain(section);

  if (!plainProduct || !plainSection) {
    return false;
  }

  if (plainSection.kind === 'pizza-presentation') {
    return (
      plainProduct.kind === 'pizza' &&
      Boolean(getVariantForSection(plainProduct, plainSection))
    );
  }

  return (
    plainProduct.kind === 'simple' &&
    plainProduct.categoryKey === plainSection.key &&
    getPricedVariants(plainProduct).length > 0
  );
}

function isPublicProduct(product) {
  const plainProduct = toPlain(product);

  if (!plainProduct || !isValidProductKey(plainProduct.key)) {
    return false;
  }

  return (
    plainProduct.schemaVersion === 1 &&
    plainProduct.available !== false &&
    plainProduct.legacy !== true &&
    getPricedVariants(plainProduct).length > 0
  );
}

function sortByOrderThenName(a, b) {
  const orderA = Number.isFinite(a.order) ? a.order : 0;
  const orderB = Number.isFinite(b.order) ? b.order : 0;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return String(a.name || '').localeCompare(String(b.name || ''));
}

function serializeVariant(variant) {
  const plainVariant = toPlain(variant);

  return {
    key: plainVariant.key,
    name: plainVariant.name,
    priceCents: Number.isInteger(plainVariant.priceCents)
      ? plainVariant.priceCents
      : null,
    available: plainVariant.available !== false,
    order: Number.isFinite(plainVariant.order) ? plainVariant.order : 0,
  };
}

function serializeOption(option) {
  const plainOption = toPlain(option);

  return {
    key: plainOption.key,
    name: plainOption.name,
    priceCents: Number.isInteger(plainOption.priceCents)
      ? plainOption.priceCents
      : null,
    available: plainOption.available !== false,
    order: Number.isFinite(plainOption.order) ? plainOption.order : 0,
  };
}

function serializeOptionGroup(optionGroup) {
  const plainGroup = toPlain(optionGroup);
  const options = Array.isArray(plainGroup.options)
    ? plainGroup.options.map(serializeOption).sort(sortByOrderThenName)
    : [];

  return {
    key: plainGroup.key,
    name: plainGroup.name,
    type: plainGroup.type,
    required: plainGroup.required === true,
    minSelections: Number.isInteger(plainGroup.minSelections)
      ? plainGroup.minSelections
      : 0,
    maxSelections: Number.isInteger(plainGroup.maxSelections)
      ? plainGroup.maxSelections
      : 1,
    options,
  };
}

function serializeMixConfig(mixConfig) {
  const plainConfig = toPlain(mixConfig);

  if (!plainConfig) {
    return null;
  }

  let allowedFlavorKeys = null;

  if (Array.isArray(plainConfig.allowedFlavorKeys)) {
    allowedFlavorKeys = plainConfig.allowedFlavorKeys.map(String);
  }

  return {
    flavorCount: Number.isInteger(plainConfig.flavorCount)
      ? plainConfig.flavorCount
      : 2,
    distinctFlavors: plainConfig.distinctFlavors === true,
    allowedFlavorKeys,
  };
}

function serializeProduct(product) {
  const plainProduct = toPlain(product);
  const variants = Array.isArray(plainProduct.variants)
    ? plainProduct.variants.map(serializeVariant).sort(sortByOrderThenName)
    : [];
  const optionGroups = Array.isArray(plainProduct.optionGroups)
    ? plainProduct.optionGroups.map(serializeOptionGroup)
    : [];
  const addonGroupKeys = Array.isArray(plainProduct.addonGroupKeys)
    ? plainProduct.addonGroupKeys.map(String)
    : [];

  return {
    key: plainProduct.key,
    name: plainProduct.name,
    description: plainProduct.description || '',
    ingredients: Array.isArray(plainProduct.ingredients)
      ? plainProduct.ingredients.map(String)
      : [],
    imageUrl: plainProduct.imageUrl || '',
    kind: plainProduct.kind,
    categoryKey: plainProduct.categoryKey ?? null,
    variantLabel: plainProduct.variantLabel || 'Presentación',
    variants,
    optionGroups,
    addonGroupKeys,
    isMix: plainProduct.isMix === true,
    mixConfig: serializeMixConfig(plainProduct.mixConfig),
    available: plainProduct.available !== false,
    order: Number.isFinite(plainProduct.order) ? plainProduct.order : 0,
  };
}

function serializeAddon(addon) {
  const plainAddon = toPlain(addon);
  const priceCents = Number.isInteger(plainAddon.priceCents)
    ? plainAddon.priceCents
    : null;
  const available = plainAddon.available !== false;
  const purchasable =
    available && Number.isInteger(priceCents) && priceCents >= 0;

  return {
    key: plainAddon.key,
    name: plainAddon.name,
    priceCents,
    maxQuantity: Number.isInteger(plainAddon.maxQuantity)
      ? plainAddon.maxQuantity
      : MAX_ADDON_QUANTITY_PER_ADDON,
    imageUrl: plainAddon.imageUrl || '',
    groupKey: plainAddon.groupKey || PIZZA_ADDON_GROUP_KEY,
    appliesToKinds: Array.isArray(plainAddon.appliesToKinds)
      ? plainAddon.appliesToKinds.map(String)
      : ['pizza'],
    available,
    purchasable,
    order: Number.isFinite(plainAddon.order) ? plainAddon.order : 0,
  };
}

function buildMenuResponse({ sections = [], products = [], addons = [] }) {
  const publicProducts = products
    .filter(isPublicProduct)
    .map(toPlain)
    .sort(sortByOrderThenName);

  const publicAddons = addons
    .filter((addon) => addon && addon.available !== false)
    .map(toPlain)
    .sort(sortByOrderThenName);

  const activeSections = sections
    .filter((section) => section && section.active !== false)
    .map(toPlain)
    .sort(sortByOrderThenName);

  const sectionDtos = activeSections.map((section) => {
    const sectionProducts = publicProducts.filter((product) =>
      productBelongsToSection(product, section)
    );

    return {
      key: section.key,
      name: section.name,
      description: section.description || '',
      imageUrl: section.imageUrl || '',
      kind: section.kind,
      presentationKey: section.presentationKey ?? null,
      order: Number.isFinite(section.order) ? section.order : 0,
      startingPriceCents: getStartingPriceCents(sectionProducts, section),
      productKeys: sectionProducts.map((product) => product.key),
    };
  });

  const referencedProductKeys = new Set(
    sectionDtos.flatMap((section) => section.productKeys)
  );

  return {
    sections: sectionDtos,
    products: publicProducts
      .filter((product) => referencedProductKeys.has(product.key))
      .map(serializeProduct),
    addons: publicAddons.map(serializeAddon),
    limits: {
      maxQuantityPerAddon: MAX_ADDON_QUANTITY_PER_ADDON,
      maxAddonUnitsPerPizza: MAX_ADDON_UNITS_PER_PIZZA,
    },
  };
}

async function getPublicMenu() {
  const [sections, products, addons] = await Promise.all([
    MenuSection.find({ active: true }).sort({ order: 1 }).lean(),
    Product.find({
      schemaVersion: 1,
      available: true,
      legacy: { $ne: true },
    })
      .sort({ order: 1 })
      .lean(),
    Addon.find({ available: true }).sort({ order: 1 }).lean(),
  ]);

  return buildMenuResponse({
    sections,
    products,
    addons,
  });
}

async function getProductByKey(key) {
  if (!isValidProductKey(key)) {
    return null;
  }

  const product = await Product.findOne({
    key,
    schemaVersion: 1,
    available: true,
    legacy: { $ne: true },
  }).lean();

  if (!product || getPricedVariants(product).length === 0) {
    return null;
  }

  const addonGroupKeys = Array.isArray(product.addonGroupKeys)
    ? product.addonGroupKeys
    : [];

  const addons =
    addonGroupKeys.length === 0
      ? []
      : await Addon.find({
          available: true,
          groupKey: { $in: addonGroupKeys },
          appliesToKinds: product.kind,
        })
          .sort({ order: 1 })
          .lean();

  return {
    product: serializeProduct(product),
    addons: addons.map(serializeAddon),
  };
}

module.exports = {
  buildMenuResponse,
  getPublicMenu,
  getProductByKey,
  getPricedVariants,
  getStartingPriceCents,
  isValidProductKey,
  productBelongsToSection,
  serializeAddon,
  serializeProduct,
};
