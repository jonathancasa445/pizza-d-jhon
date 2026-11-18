import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTACT_WHATSAPP_PHONE,
  MESSAGE_TYPES,
  buildContactMessage,
  buildContactWhatsAppUrl,
  validateContactForm,
} from './contactMessage.js';

const validValues = {
  name: 'María',
  email: 'maria@ejemplo.com',
  messageType: 'Consulta',
  message: '¿Hacen envíos a Ciudadela?',
};

test('valida campos obligatorios y deja el correo como opcional', () => {
  const errors = validateContactForm({
    name: '',
    email: '',
    messageType: '',
    message: '',
  });

  assert.deepEqual(Object.keys(errors).sort(), [
    'message',
    'messageType',
    'name',
  ]);
  assert.deepEqual(validateContactForm(validValues), {});
});

test('rechaza un correo con formato inválido', () => {
  const errors = validateContactForm({
    ...validValues,
    email: 'no-es-un-correo',
  });

  assert.ok(errors.email);
});

test('acepta los tres tipos de mensaje', () => {
  assert.deepEqual(MESSAGE_TYPES, [
    'Consulta',
    'Sugerencia',
    'Comentario',
  ]);

  for (const messageType of MESSAGE_TYPES) {
    assert.deepEqual(
      validateContactForm({ ...validValues, messageType }),
      {}
    );
  }

  assert.ok(validateContactForm({ ...validValues, messageType: 'Otro' }).messageType);
});

test('construye un mensaje organizado con tildes y saltos de línea', () => {
  const message = buildContactMessage({
    ...validValues,
    name: 'José',
    message: 'Quisiera información:\n¿Hacen envíos a Ciudadela? ¡Gracias!',
  });

  assert.match(message, /Nombre: José/);
  assert.match(message, /Correo: maria@ejemplo\.com/);
  assert.match(message, /Tipo de mensaje: Consulta/);
  assert.match(message, /¿Hacen envíos a Ciudadela\? ¡Gracias!/);
  assert.ok(message.includes('\n'));
});

test('omite la línea de correo cuando no se proporciona', () => {
  const message = buildContactMessage({ ...validValues, email: '' });

  assert.ok(!message.includes('Correo:'));
});

test('genera el enlace de WhatsApp con el número y el texto codificado', () => {
  assert.equal(CONTACT_WHATSAPP_PHONE, '593967715368');

  const url = buildContactWhatsAppUrl(validValues);

  assert.ok(url.startsWith(`https://wa.me/${CONTACT_WHATSAPP_PHONE}?text=`));

  const encoded = url.split('?text=')[1];
  const decoded = decodeURIComponent(encoded);

  assert.match(decoded, /Nombre: María/);
  assert.match(decoded, /Tipo de mensaje: Consulta/);
  assert.match(decoded, /Hola Pizza D’ John/);
});
