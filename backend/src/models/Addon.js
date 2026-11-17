const mongoose = require('mongoose');
const {
  PIZZA_ADDON_GROUP_KEY,
  MAX_ADDON_QUANTITY_PER_ADDON,
} = require('../constants/catalog');
const { isValidPriceCents } = require('../utils/money');

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const addonSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [KEY_PATTERN, 'La clave del adicional no es válida.'],
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    priceCents: {
      type: Number,
      default: null,
      validate: {
        validator: isValidPriceCents,
        message:
          'priceCents debe ser un entero mayor o igual a 0, o null.',
      },
    },

    maxQuantity: {
      type: Number,
      default: MAX_ADDON_QUANTITY_PER_ADDON,
      min: 1,
      max: MAX_ADDON_QUANTITY_PER_ADDON,
      validate: {
        validator: Number.isInteger,
        message: 'maxQuantity debe ser un entero.',
      },
    },

    imageUrl: {
      type: String,
      default: '',
    },

    groupKey: {
      type: String,
      default: PIZZA_ADDON_GROUP_KEY,
      trim: true,
      lowercase: true,
    },

    appliesToKinds: {
      type: [String],
      default: ['pizza'],
    },

    available: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
    },

    schemaVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    autoIndex: false,
    autoCreate: false,
  }
);

addonSchema.index({ key: 1 }, { unique: true });
addonSchema.index({ available: 1, groupKey: 1, order: 1 });

module.exports =
  mongoose.models.Addon ||
  mongoose.model('Addon', addonSchema);
