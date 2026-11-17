export function formatCents(cents) {
  if (!Number.isInteger(cents) || cents < 0) {
    return 'Precio por definir';
  }

  return `$${(cents / 100).toFixed(2)}`;
}
