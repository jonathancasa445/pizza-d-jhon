import { formatCents } from '../utils/money';

function getDisplayVariant(product, presentationKey) {
  if (presentationKey) {
    const presentationVariant = product.variants.find(
      (variant) =>
        variant.key === presentationKey &&
        variant.available !== false &&
        Number.isInteger(variant.priceCents)
    );

    if (presentationVariant) {
      return presentationVariant;
    }
  }

  return (
    product.variants.find(
      (variant) =>
        variant.available !== false && Number.isInteger(variant.priceCents)
    ) ?? null
  );
}

function ProductCard({ product, presentationKey }) {
  const variant = getDisplayVariant(product, presentationKey);
  const priceCents = variant ? variant.priceCents : null;
  const ingredients = Array.isArray(product.ingredients)
    ? product.ingredients
    : [];

  return (
    <article className="product-card">
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

      <button type="button" disabled>
        Próximamente
      </button>
    </article>
  );
}

export default ProductCard;
