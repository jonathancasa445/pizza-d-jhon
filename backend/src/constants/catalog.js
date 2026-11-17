const PRESENTATION_KEYS = Object.freeze([
  'familiar',
  'mediana',
  'borde',
]);

const PIZZA_ADDON_GROUP_KEY = 'pizza-extras';

const MAX_ADDON_QUANTITY_PER_ADDON = 3;
const MAX_ADDON_UNITS_PER_PIZZA = 10;

const SECTION_KINDS = Object.freeze([
  'pizza-presentation',
  'standard',
]);

const PRODUCT_KINDS = Object.freeze(['pizza', 'simple']);

const MIX_FLAVOR_COUNT = 2;

module.exports = {
  PRESENTATION_KEYS,
  PIZZA_ADDON_GROUP_KEY,
  MAX_ADDON_QUANTITY_PER_ADDON,
  MAX_ADDON_UNITS_PER_PIZZA,
  SECTION_KINDS,
  PRODUCT_KINDS,
  MIX_FLAVOR_COUNT,
};
