const mongoose = require('mongoose');
const {
  PRESENTATION_KEYS,
  PRODUCT_KINDS,
  MIX_FLAVOR_COUNT,
} = require('../constants/catalog');
const { isValidPriceCents } = require('../utils/money');

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const variantSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [KEY_PATTERN, 'La clave de la variante no es válida.'],
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

    available: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const optionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [KEY_PATTERN, 'La clave de la opción no es válida.'],
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

    available: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const optionGroupSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [KEY_PATTERN, 'La clave del grupo no es válida.'],
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ['single', 'multiple'],
      required: true,
    },

    required: {
      type: Boolean,
      default: false,
    },

    minSelections: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxSelections: {
      type: Number,
      default: 1,
      min: 1,
    },

    options: {
      type: [optionSchema],
      default: [],
    },
  },
  { _id: false }
);

const mixConfigSchema = new mongoose.Schema(
  {
    flavorCount: {
      type: Number,
      default: MIX_FLAVOR_COUNT,
      validate: {
        validator: (value) => value === MIX_FLAVOR_COUNT,
        message: 'La pizza mixta debe exigir exactamente dos sabores.',
      },
    },

    distinctFlavors: {
      type: Boolean,
      default: true,
      validate: {
        validator: (value) => value === true,
        message: 'Los dos sabores de la pizza mixta deben ser diferentes.',
      },
    },

    allowedFlavorKeys: {
      type: [String],
      default: null,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [KEY_PATTERN, 'La clave del producto no es válida.'],
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },

    ingredients: {
      type: [String],
      default: [],
    },

    imageUrl: {
      type: String,
      default: '',
    },

    // Campos legacy: se conservan para leer los documentos antiguos.
    price: {
      type: Number,
      min: 0,
    },

    category: {
      type: String,
      trim: true,
    },

    kind: {
      type: String,
      enum: PRODUCT_KINDS,
      required: true,
    },

    categoryKey: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },

    variantLabel: {
      type: String,
      default: 'Presentación',
      trim: true,
    },

    variants: {
      type: [variantSchema],
      default: [],
    },

    optionGroups: {
      type: [optionGroupSchema],
      default: [],
    },

    addonGroupKeys: {
      type: [String],
      default: [],
    },

    isMix: {
      type: Boolean,
      default: false,
    },

    mixConfig: {
      type: mixConfigSchema,
      default: null,
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
      default: 0,
    },

    legacy: {
      type: Boolean,
      default: false,
    },

    legacyAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    autoIndex: false,
    autoCreate: false,
  }
);

productSchema.index(
  { key: 1 },
  {
    unique: true,
    partialFilterExpression: {
      key: { $type: 'string' },
    },
  }
);

productSchema.index({
  schemaVersion: 1,
  available: 1,
  kind: 1,
  order: 1,
});

productSchema.index({
  categoryKey: 1,
  order: 1,
});

productSchema.pre('validate', function validatePresentationKeys() {
  if (this.kind === 'pizza' && this.variants.length > 0) {
    const invalidVariant = this.variants.find(
      (variant) => !PRESENTATION_KEYS.includes(variant.key)
    );

    if (invalidVariant) {
      this.invalidate(
        'variants',
        `La variante "${invalidVariant.key}" no es una presentación válida.`
      );
    }
  }

  if (this.isMix) {
    if (this.kind !== 'pizza') {
      this.invalidate('isMix', 'Solo una pizza puede ser mixta.');
    }

    if (!this.mixConfig) {
      this.invalidate(
        'mixConfig',
        'Una pizza mixta debe tener mixConfig.'
      );
    }
  }

  if (!this.isMix && this.mixConfig) {
    this.invalidate(
      'mixConfig',
      'mixConfig solo debe existir en pizzas mixtas.'
    );
  }
});

module.exports =
  mongoose.models.Product ||
  mongoose.model('Product', productSchema);
