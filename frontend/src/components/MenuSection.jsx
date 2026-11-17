import MenuAccordion from './MenuAccordion';
import ProductCard from './ProductCard';
import { formatCents } from '../utils/money';

function MenuSection({
  section,
  products,
  defaultOpen,
  onSelectProduct,
}) {
  const hasProducts = products.length > 0;
  const meta =
    section.startingPriceCents != null
      ? `Desde ${formatCents(section.startingPriceCents)}`
      : '';

  return (
    <MenuAccordion title={section.name} meta={meta} defaultOpen={defaultOpen}>
      {section.description && (
        <p className="section-description">{section.description}</p>
      )}

      {hasProducts ? (
        <div className="product-list">
          {products.map((product) => (
            <ProductCard
              key={`${section.key}-${product.key}`}
              product={product}
              presentationKey={section.presentationKey}
              onSelect={(selectedProduct) =>
                onSelectProduct?.(selectedProduct, section)
              }
            />
          ))}
        </div>
      ) : (
        <p className="empty-section">Próximamente</p>
      )}
    </MenuAccordion>
  );
}

export default MenuSection;
