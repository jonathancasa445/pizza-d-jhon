import { buildWhatsAppUrl } from './orderMessage.js';

export const CONTACT_WHATSAPP_PHONE = '593967715368';

export const MESSAGE_TYPES = Object.freeze([
  'Consulta',
  'Sugerencia',
  'Comentario',
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 500;

function readTrimmed(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateContactForm(values = {}) {
  const errors = {};
  const name = readTrimmed(values.name);
  const email = readTrimmed(values.email);
  const messageType = readTrimmed(values.messageType);
  const message = readTrimmed(values.message);

  if (!name) {
    errors.name = 'Escribe tu nombre.';
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `El nombre no puede superar ${MAX_NAME_LENGTH} caracteres.`;
  }

  if (email) {
    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
      errors.email = 'Revisa el correo electrónico.';
    }
  }

  if (!messageType) {
    errors.messageType = 'Elige un tipo de mensaje.';
  } else if (!MESSAGE_TYPES.includes(messageType)) {
    errors.messageType = 'Elige una opción válida.';
  }

  if (!message) {
    errors.message = 'Escribe tu mensaje.';
  } else if (message.length > MAX_MESSAGE_LENGTH) {
    errors.message = `El mensaje no puede superar ${MAX_MESSAGE_LENGTH} caracteres.`;
  }

  return errors;
}

export function buildContactMessage(values = {}) {
  const name = readTrimmed(values.name);
  const email = readTrimmed(values.email);
  const messageType = readTrimmed(values.messageType);
  const message = readTrimmed(values.message);

  const lines = [
    'Hola Pizza D’ John,',
    '',
    `Nombre: ${name}`,
  ];

  if (email) {
    lines.push(`Correo: ${email}`);
  }

  lines.push(
    `Tipo de mensaje: ${messageType}`,
    '',
    message,
    '',
    'Mensaje enviado desde el formulario de contacto de la web.'
  );

  return lines.join('\n');
}

export function buildContactWhatsAppUrl(values = {}) {
  return buildWhatsAppUrl(
    CONTACT_WHATSAPP_PHONE,
    buildContactMessage(values)
  );
}
