const configuredPhone = import.meta.env.VITE_WHATSAPP_PHONE;

export const WHATSAPP_PHONE =
  typeof configuredPhone === 'string'
    ? configuredPhone.replace(/\D/g, '')
    : '';

export const WHATSAPP_MISSING_MESSAGE =
  'WhatsApp no está configurado. Añade VITE_WHATSAPP_PHONE en el archivo .env del frontend y reinicia el servidor.';

export function getWhatsAppPhone() {
  return WHATSAPP_PHONE;
}

export function isWhatsAppConfigured() {
  return /^\d{8,15}$/.test(WHATSAPP_PHONE);
}
