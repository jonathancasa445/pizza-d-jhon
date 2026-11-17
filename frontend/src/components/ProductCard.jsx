import { formatCents } from '../utils/money';
import { getPresentationVariant } from '../utils/pizzaConfig';

function ProductCard({ product, presentationKey, onSelect }) {
  const variant = getPresentationVariant(product, presentationKey);
  const priceCents = variant ? variant.priceCents : null;
  const ingredients = Array.isArray(product.ingredients)
    ? product.ingredients
    : [];
  const handleSelect = () => onSelect?.(product);

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect();
    }
  }

  return (
    <article
      className="product-card"
      role="button"
      tabIndex={0}
      aria-label={`Personalizar ${product.name}`}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      {product.imageUrl && (
        <img src={product.imageUrl} alt={product.name} />
      )}

      <h4>{product.name}</h4>

      <p>{product.description}</p>

      {ingredients.length > 0 && (
        <p>
          <strong>Ingredientes:</strong> {ingredients.join(', ')}
        </p>
      )}

      <p className="product-price">{formatCents(priceCents)}</p>

      <span className="product-card-action" aria-hidden="true">
        Personalizar
      </span>
    </article>
  );
}

export default ProductCard;
