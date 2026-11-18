const mongoose = require('mongoose');

const {
  ADMIN_USERNAME_MIN_LENGTH,
  ADMIN_USERNAME_MAX_LENGTH,
  ADMIN_USERNAME_PATTERN,
  PASSWORD_PARAMS,
  normalizeUsername,
} = require('../constants/admin');

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const SALT_PATTERN = /^[a-f0-9]{32}$/;

const passwordParamsSchema = new mongoose.Schema(
  {
    algorithm: {
      type: String,
      required: true,
      enum: ['scrypt'],
      default: PASSWORD_PARAMS.algorithm,
    },
    N: { type: Number, required: true, min: 1, default: PASSWORD_PARAMS.N },
    r: { type: Number, required: true, min: 1, default: PASSWORD_PARAMS.r },
    p: { type: Number, required: true, min: 1, default: PASSWORD_PARAMS.p },
    keyLength: {
      type: Number,
      required: true,
      min: 1,
      default: PASSWORD_PARAMS.keyLength,
    },
    saltLength: {
      type: Number,
      required: true,
      min: 1,
      default: PASSWORD_PARAMS.saltLength,
    },
    maxmem: {
      type: Number,
      required: true,
      min: 1,
      default: PASSWORD_PARAMS.maxmem,
    },
  },
  { _id: false }
);

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: ADMIN_USERNAME_MIN_LENGTH,
      maxlength: ADMIN_USERNAME_MAX_LENGTH,
      match: [
        ADMIN_USERNAME_PATTERN,
        'El nombre de usuario solo admite letras minúsculas, números, punto, guion y guion bajo.',
      ],
      set: normalizeUsername,
    },

    // Nunca se almacena la contraseña en claro: solo salt y hash scrypt.
    passwordHash: {
      type: String,
      required: true,
      select: false,
      match: [HASH_PATTERN, 'El hash de la contraseña no es válido.'],
    },

    passwordSalt: {
      type: String,
      required: true,
      select: false,
      match: [SALT_PATTERN, 'El salt de la contraseña no es válido.'],
    },

    passwordParams: {
      type: passwordParamsSchema,
      required: true,
      default: () => ({ ...PASSWORD_PARAMS }),
    },

    active: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
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

adminSchema.index({ username: 1 }, { unique: true });

module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
