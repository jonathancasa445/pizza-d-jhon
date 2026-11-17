import { useId, useState } from 'react';

function MenuAccordion({ title, meta, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const baseId = useId();
  const buttonId = `${baseId}-button`;
  const panelId = `${baseId}-panel`;

  return (
    <section className={`menu-accordion${isOpen ? ' is-open' : ''}`}>
      <h3 className="menu-accordion-heading">
        <button
          id={buttonId}
          type="button"
          className="menu-accordion-trigger"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="menu-accordion-title">{title}</span>

          <span className="menu-accordion-meta">
            {meta && <span>{meta}</span>}

            <span className="menu-accordion-icon" aria-hidden="true">
              {isOpen ? '−' : '+'}
            </span>
          </span>
        </button>
      </h3>

      <div
        id={panelId}
        className="menu-accordion-panel"
        role="region"
        aria-labelledby={buttonId}
        hidden={!isOpen}
      >
        {children}
      </div>
    </section>
  );
}

export default MenuAccordion;
