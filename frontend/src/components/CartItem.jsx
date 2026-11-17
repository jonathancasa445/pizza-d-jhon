import {
  getCartItemId,
  getCartItemLineTotalCents,
  getCartItemQuantity,
  getCartItemUnitPriceCents,
} from '../utils/cart';
import { formatCents } from '../utils/money';

function CartItem({
  item,
  index,
  onChangeQuantity,
  onRemove,
}) {
  const itemId = getCartItemId(item, index);
  const quantity = getCartItemQuantity(item);
  const unitPriceCents = getCartItemUnitPriceCents(item);
  const lineTotalCents = getCartItemLineTotalCents(item);
  const flavors = Array.isArray(item.selectedFlavors)
    ? item.selectedFlavors
    : [];
  const addons = Array.isArray(item.addons) ? item.addons : [];
  const itemName = item.name || 'Producto sin nombre';

  return (
    <article className="cart-item" data-cart-item-id={itemId}>
      <div className="cart-item-main">
        {item.imageUrl && (
          <img
            className="cart-item-image"
            src={item.imageUrl}
            alt=""
          />
        )}

        <div className="cart-item-details">
          <h3>{itemName}</h3>

          {item.presentationName && (
            <p>
              <strong>Presentación:</strong>{' '}
              {item.presentationName}
            </p>
          )}

          {flavors.length > 0 && (
            <p>
              <strong>Sabores:</strong>{' '}
              {flavors.map((flavor) => flavor.name).join(' + ')}
            </p>
          )}

          {addons.length > 0 && (
            <p>
              <strong>Complementos:</strong>{' '}
              {addons
                .map(
                  (addon) => `${addon.name} ×${addon.quantity}`
                )
                .join(', ')}
            </p>
          )}

          <p>
            Precio unitario: {formatCents(unitPriceCents)}
          </p>

          <div className="quantity-controls">
            <button
              type="button"
              onClick={() => onChangeQuantity(itemId, -1)}
              aria-label={`Disminuir cantidad de ${itemName}`}
            >
              −
            </button>

            <span>{quantity}</span>

            <button
              type="button"
              onClick={() => onChangeQuantity(itemId, 1)}
              aria-label={`Aumentar cantidad de ${itemName}`}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="cart-item-actions">
        <p className="cart-item-total">
          {formatCents(lineTotalCents)}
        </p>

        <button
          type="button"
          className="remove-button"
          onClick={() => onRemove(itemId)}
        >
          Eliminar
        </button>
      </div>
    </article>
  );
}

export default CartItem;
