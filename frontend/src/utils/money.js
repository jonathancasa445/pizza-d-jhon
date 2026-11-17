export function formatCents(cents) {
  if (!Number.isInteger(cents) || cents < 0) {
    return 'Precio por definir';
  }

  return `$${(cents / 100).toFixed(2)}`;
}

export function dollarsToCents(amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    return 0;
  }

  return Math.round(numericAmount * 100);
}
