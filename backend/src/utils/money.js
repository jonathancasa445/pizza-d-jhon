function isValidPriceCents(value) {
  return (
    value === null ||
    (Number.isInteger(value) && value >= 0)
  );
}

function assertValidPriceCents(value, label) {
  if (!isValidPriceCents(value)) {
    throw new Error(
      `${label}: priceCents debe ser un entero mayor o igual a 0, o null.`
    );
  }
}

function centsToUsd(cents) {
  if (!Number.isInteger(cents) || cents < 0) {
    return null;
  }

  return cents / 100;
}

module.exports = {
  isValidPriceCents,
  assertValidPriceCents,
  centsToUsd,
};
