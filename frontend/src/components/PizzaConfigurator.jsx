import { useEffect, useMemo, useRef, useState } from 'react';
import { formatCents } from '../utils/money';
import {
  buildCartItem,
  canIncreaseAddon,
  getAddonQuantityTotal,
  getAddonSubtotalCents,
  getAvailableAddons,
  getMaxAddonUnits,
  getMaxQuantityPerAddon,
  getMixFlavorOptions,
  getPresentationVariant,
} from '../utils/pizzaConfig';

function PizzaConfigurator({
  product,
  presentationKey,
  sectionName,
  menu,
  onClose,
  onAdd,
}) {
  const [selectedFlavorKeys, setSelectedFlavorKeys] = useState([]);
  const [addonQuantities, setAddonQuantities] = useState({});
  const closeButtonRef = useRef(null);

  const variant = getPresentationVariant(product, presentationKey);
  const availableAddons = useMemo(
    () => getAvailableAddons(product, menu?.addons ?? []),
    [product, menu]
  );
  const flavorOptions = useMemo(
    () =>
      product.isMix
        ? getMixFlavorOptions(product, menu?.products ?? [])
        : [],
    [product, menu]
  );
  const requiredFlavorCount = product.mixConfig?.flavorCount ?? 2;
  const selectedFlavors = selectedFlavorKeys
    .map((flavorKey) =>
      flavorOptions.find((flavor) => flavor.key === flavorKey)
    )
    .filter(Boolean);
  const isMix = product.isMix === true;
  const hasValidFlavors =
    !isMix ||
    (selectedFlavors.length === requiredFlavorCount &&
      new Set(selectedFlavors.map((flavor) => flavor.key)).size ===
        requiredFlavorCount);
  const basePriceCents = variant?.priceCents ?? 0;
  const addonSubtotalCents = getAddonSubtotalCents(
    availableAddons,
    addonQuantities
  );
  const finalUnitPriceCents = basePriceCents + addonSubtotalCents;
  const addonTotalUnits = getAddonQuantityTotal(addonQuantities);
  const maxAddonUnits = getMaxAddonUnits(menu?.limits);
  const defaultAddon = availableAddons[0] ?? null;
  const defaultAddonPriceCents = defaultAddon?.priceCents ?? 0;
  const defaultAddonMaxQuantity = defaultAddon
    ? getMaxQuantityPerAddon(defaultAddon, menu?.limits)
    : 0;
  const canAdd = Boolean(variant) && hasValidFlavors;

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  function toggleFlavor(flavorKey) {
    setSelectedFlavorKeys((currentFlavors) => {
      if (currentFlavors.includes(flavorKey)) {
        return currentFlavors.filter((key) => key !== flavorKey);
      }

      if (currentFlavors.length >= requiredFlavorCount) {
        return currentFlavors;
      }

      return [...currentFlavors, flavorKey];
    });
  }

  function changeAddonQuantity(addon, change) {
    setAddonQuantities((currentQuantities) => {
      const currentQuantity = currentQuantities[addon.key] ?? 0;

      if (change > 0) {
        if (!canIncreaseAddon(addon, currentQuantities, menu?.limits)) {
          return currentQuantities;
        }

        return {
          ...currentQuantities,
          [addon.key]: currentQuantity + 1,
        };
      }

      if (currentQuantity <= 0) {
        return currentQuantities;
      }

      const nextQuantity = currentQuantity - 1;
      const nextQuantities = { ...currentQuantities };

      if (nextQuantity <= 0) {
        delete nextQuantities[addon.key];
      } else {
        nextQuantities[addon.key] = nextQuantity;
      }

      return nextQuantities;
    });
  }

  function handleAdd() {
    if (!canAdd) {
      return;
    }

    const cartItem = buildCartItem({
      product,
      variant,
      presentationKey,
      selectedFlavors,
      addons: availableAddons,
      addonQuantities,
    });

    onAdd(cartItem);
  }

  return (
    <div
      className="configurator-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="configurator"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pizza-configurator-title"
      >
        <div className="configurator-header">
          <div>
            <p className="configurator-eyebrow">
              {sectionName || 'Personaliza tu pizza'}
            </p>
            <h2 id="pizza-configurator-title">{product.name}</h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className="configurator-close"
            onClick={onClose}
            aria-label="Cerrar configurador"
          >
            ×
          </button>
        </div>

        <div className="configurator-body">
          <div className="configurator-product">
            {product.imageUrl && (
              <img src={product.imageUrl} alt={product.name} />
            )}

            <div>
              <p>{product.description}</p>
              <p>
                <strong>Presentación:</strong>{' '}
                {variant?.name || 'No disponible'}
              </p>
              <p>
                <strong>Precio base:</strong>{' '}
                {formatCents(basePriceCents)}
              </p>

              {isMix && (
                <p className="configurator-note">
                  Cada mitad representa el 50 % de la pizza. El precio
                  de la presentación no cambia por combinar sabores.
                </p>
              )}
            </div>
          </div>

          {isMix && (
            <section
              className="configurator-block"
              aria-labelledby="mix-flavors-title"
            >
              <h3 id="mix-flavors-title">Elige los dos sabores</h3>
              <p className="configurator-hint">
                Selecciona exactamente dos sabores diferentes. La Mixta
                no puede repetirse ni elegirse como sabor.
              </p>

              <div className="flavor-options">
                {flavorOptions.map((flavor) => {
                  const selectedIndex =
                    selectedFlavorKeys.indexOf(flavor.key);
                  const isSelected = selectedIndex !== -1;
                  const isDisabled =
                    !isSelected &&
                    selectedFlavorKeys.length >= requiredFlavorCount;

                  return (
                    <button
                      key={flavor.key}
                      type="button"
                      className={`flavor-option${
                        isSelected ? ' is-selected' : ''
                      }`}
                      aria-pressed={isSelected}
                      disabled={isDisabled}
                      onClick={() => toggleFlavor(flavor.key)}
                      data-flavor-key={flavor.key}
                    >
                      <span>{flavor.name}</span>

                      {isSelected && (
                        <span className="flavor-badge">
                          Sabor {selectedIndex + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p
                className={`mix-summary${
                  hasValidFlavors ? ' is-complete' : ''
                }`}
                aria-live="polite"
              >
                {hasValidFlavors
                  ? `50% ${selectedFlavors[0].name} + 50% ${selectedFlavors[1].name}`
                  : `Sabores seleccionados: ${selectedFlavors.length}/${requiredFlavorCount}.`}
              </p>
            </section>
          )}

          <section
            className="configurator-block"
            aria-labelledby="addons-title"
          >
            <div className="configurator-block-heading">
              <h3 id="addons-title">Complementos</h3>
              <span className="addon-counter">
                {addonTotalUnits}/{maxAddonUnits} unidades
              </span>
            </div>

            {availableAddons.length > 0 && (
              <p className="configurator-hint">
                Cada complemento cuesta{' '}
                {formatCents(defaultAddonPriceCents)}. Máximo{' '}
                {defaultAddonMaxQuantity} por complemento y{' '}
                {maxAddonUnits} en total por pizza.
              </p>
            )}

            {availableAddons.length === 0 ? (
              <p>No hay complementos disponibles.</p>
            ) : (
              <div className="addon-list">
                {availableAddons.map((addon) => {
                  const quantity = addonQuantities[addon.key] ?? 0;
                  const maxPerAddon = getMaxQuantityPerAddon(
                    addon,
                    menu?.limits
                  );
                  const canIncrease = canIncreaseAddon(
                    addon,
                    addonQuantities,
                    menu?.limits
                  );

                  return (
                    <div
                      className="addon-item"
                      key={addon.key}
                      data-addon-key={addon.key}
                    >
                      <div className="addon-info">
                        <strong>{addon.name}</strong>
                        <span className="addon-price">
                          +{formatCents(addon.priceCents)} c/u · máx.{' '}
                          {maxPerAddon}
                        </span>
                      </div>

                      <div className="addon-controls">
                        <button
                          type="button"
                          onClick={() =>
                            changeAddonQuantity(addon, -1)
                          }
                          disabled={quantity <= 0}
                          aria-label={`Disminuir ${addon.name}`}
                        >
                          −
                        </button>

                        <span className="addon-count" aria-live="polite">
                          {quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => changeAddonQuantity(addon, 1)}
                          disabled={!canIncrease}
                          aria-label={`Aumentar ${addon.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="configurator-summary">
              Subtotal de complementos:{' '}
              <strong>{formatCents(addonSubtotalCents)}</strong>
            </p>
          </section>

          {!canAdd && (
            <p className="configurator-warning">
              {!variant
                ? 'Esta presentación no está disponible.'
                : 'Selecciona exactamente dos sabores diferentes para continuar.'}
            </p>
          )}
        </div>

        <div className="configurator-footer">
          <div className="configurator-total" aria-live="polite">
            <span>Precio final por pizza</span>
            <strong>{formatCents(finalUnitPriceCents)}</strong>
            <small>
              {formatCents(basePriceCents)} base +{' '}
              {formatCents(addonSubtotalCents)} complementos
            </small>
          </div>

          <div className="configurator-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="primary-button configurator-add-button"
              onClick={handleAdd}
              disabled={!canAdd}
            >
              Añadir al carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PizzaConfigurator;
