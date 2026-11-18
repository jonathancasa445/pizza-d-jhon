const mongoose = require('mongoose');
const { MAX_ADDON_QUANTITY_PER_ADDON } = require('../constants/catalog');
const {
  ORDER_MODALITIES,
  ORDER_STATUSES,
  ORDER_CURRENCY,
  MAX_ORDER_ITEMS,
  MAX_ORDER_ITEM_QUANTITY,
  MAX_CUSTOMER_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
  MAX_REFERENCE_LENGTH,
  MAX_OBSERVATIONS_LENGTH,
  UUID_V4_PATTERN,
  SHA256_PATTERN,
} = require('../constants/order');

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_CUSTOMER_NAME_LENGTH,
    },
  },
  { _id: false }
);

const orderFlavorSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const orderAddonSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    priceCents: {
      type: Number,
      required: true,
      validate: {
        validator: isNonNegativeInteger,
        message: 'priceCents debe ser un entero mayor o igual a 0.',
      },
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_ADDON_QUANTITY_PER_ADDON,
      validate: {
        validator: Number.isInteger,
        message: 'La cantidad del adicional debe ser un entero.',
      },
    },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    productKey: {
      type: String,
      required: true,
      trim: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    presentationKey: {
      type: String,
      required: true,
      trim: true,
    },

    presentationName: {
      type: String,
      required: true,
      trim: true,
    },

    basePriceCents: {
      type: Number,
      required: true,
      validate: {
        validator: isNonNegativeInteger,
        message: 'basePriceCents debe ser un entero mayor o igual a 0.',
      },
    },

    addonsSubtotalCents: {
      type: Number,
      required: true,
      validate: {
        validator: isNonNegativeInteger,
        message:
          'addonsSubtotalCents debe ser un entero mayor o igual a 0.',
      },
    },

    unitPriceCents: {
      type: Number,
      required: true,
      validate: {
        validator: isNonNegativeInteger,
        message: 'unitPriceCents debe ser un entero mayor o igual a 0.',
      },
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_ORDER_ITEM_QUANTITY,
      validate: {
        validator: Number.isInteger,
        message: 'La cantidad del producto debe ser un entero.',
      },
    },

    lineTotalCents: {
      type: Number,
      required: true,
      validate: {
        validator: isNonNegativeInteger,
        message: 'lineTotalCents debe ser un entero mayor o igual a 0.',
      },
    },

    isMix: {
      type: Boolean,
      default: false,
    },

    flavors: {
      type: [orderFlavorSchema],
      default: [],
    },

    addons: {
      type: [orderAddonSchema],
      default: [],
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
      match: [UUID_V4_PATTERN, 'La clave de idempotencia no es válida.'],
    },

    requestHash: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [SHA256_PATTERN, 'El hash del pedido no es válido.'],
    },

    customer: {
      type: customerSchema,
      required: true,
    },

    modality: {
      type: String,
      enum: ORDER_MODALITIES,
      required: true,
    },

    address: {
      type: String,
      default: '',
      trim: true,
      maxlength: MAX_ADDRESS_LENGTH,
    },

    reference: {
      type: String,
      default: '',
      trim: true,
      maxlength: MAX_REFERENCE_LENGTH,
    },

    observations: {
      type: String,
      default: '',
      trim: true,
      maxlength: MAX_OBSERVATIONS_LENGTH,
    },

    items: {
      type: [orderItemSchema],
      default: [],
    },

    subtotalCents: {
      type: Number,
      required: true,
      validate: {
        validator: isNonNegativeInteger,
        message: 'subtotalCents debe ser un entero mayor o igual a 0.',
      },
    },

    totalCents: {
      type: Number,
      required: true,
      validate: {
        validator: isNonNegativeInteger,
        message: 'totalCents debe ser un entero mayor o igual a 0.',
      },
    },

    currency: {
      type: String,
      enum: [ORDER_CURRENCY],
      default: ORDER_CURRENCY,
    },

    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'pending',
    },
  },
  {
    timestamps: true,
    autoIndex: false,
    autoCreate: false,
  }
);

orderSchema.index({ idempotencyKey: 1 }, { unique: true });

orderSchema.pre('validate', function validateOrder() {
  if (!Array.isArray(this.items) || this.items.length === 0) {
    this.invalidate('items', 'El pedido debe contener al menos un producto.');
  } else if (this.items.length > MAX_ORDER_ITEMS) {
    this.invalidate(
      'items',
      `El pedido no puede contener más de ${MAX_ORDER_ITEMS} líneas.`
    );
  }

  if (this.modality === 'delivery') {
    if (!String(this.address ?? '').trim()) {
      this.invalidate(
        'address',
        'La dirección es obligatoria para pedidos a domicilio.'
      );
    }
  } else if (this.modality === 'pickup') {
    this.address = '';
  }

  if (this.subtotalCents !== this.totalCents) {
    this.invalidate(
      'totalCents',
      'El total debe coincidir con el subtotal en esta fase.'
    );
  }
});

module.exports =
  mongoose.models.Order || mongoose.model('Order', orderSchema);
