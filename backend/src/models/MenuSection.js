const mongoose = require('mongoose');
const {
  PRESENTATION_KEYS,
  SECTION_KINDS,
} = require('../constants/catalog');

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const menuSectionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [KEY_PATTERN, 'La clave de la sección no es válida.'],
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

    imageUrl: {
      type: String,
      default: '',
    },

    order: {
      type: Number,
      default: 0,
    },

    active: {
      type: Boolean,
      default: true,
    },

    kind: {
      type: String,
      enum: SECTION_KINDS,
      required: true,
    },

    presentationKey: {
      type: String,
      default: null,
      validate: {
        validator: (value) =>
          value === null || PRESENTATION_KEYS.includes(value),
        message: 'La presentación de la sección no es válida.',
      },
    },
  },
  {
    timestamps: true,
    autoIndex: false,
    autoCreate: false,
  }
);

menuSectionSchema.index({ key: 1 }, { unique: true });
menuSectionSchema.index({ active: 1, order: 1 });

menuSectionSchema.pre('validate', function validateSectionKind() {
  if (this.kind === 'pizza-presentation') {
    if (!PRESENTATION_KEYS.includes(this.presentationKey)) {
      this.invalidate(
        'presentationKey',
        'Una sección de presentación debe tener una presentación válida.'
      );
    }
  }

  if (this.kind === 'standard' && this.presentationKey !== null) {
    this.invalidate(
      'presentationKey',
      'Una sección estándar no debe tener presentationKey.'
    );
  }
});

module.exports =
  mongoose.models.MenuSection ||
  mongoose.model('MenuSection', menuSectionSchema);
