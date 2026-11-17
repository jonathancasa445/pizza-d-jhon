import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import CartDrawer from './components/CartDrawer';
import CartItem from './components/CartItem';
import MenuSection from './components/MenuSection';
import PizzaConfigurator from './components/PizzaConfigurator';
import { useMenu } from './hooks/useMenu';
import {
  getCartCount,
  getCartItemId,
  getCartItemQuantity,
  getCartTotalCents,
} from './utils/cart';
import { formatCents } from './utils/money';

function App() {
  const [currentYear] = useState(() => new Date().getFullYear());
  const { menu, loading, error, retry } = useMenu();
  const [selectedPizza, setSelectedPizza] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('pizza-cart');

      if (!savedCart) {
        return [];
      }

      const parsedCart = JSON.parse(savedCart);

      return Array.isArray(parsedCart)
        ? parsedCart.filter(
            (item) => item && typeof item === 'object'
          )
        : [];
    } catch (error) {
      console.error('Error al recuperar el carrito:', error);
      return [];
    }
  });

  const productsByKey = useMemo(
    () =>
      new Map(
        (menu?.products ?? []).map((product) => [product.key, product])
      ),
    [menu]
  );

  useEffect(() => {
    localStorage.setItem('pizza-cart', JSON.stringify(cart));
  }, [cart]);

  const handleSelectProduct = useCallback((product, section) => {
    setIsCartOpen(false);
    setSelectedPizza({
      product,
      presentationKey: section.presentationKey,
      sectionName: section.name,
    });
  }, []);

  const handleCloseConfigurator = useCallback(() => {
    setSelectedPizza(null);
  }, []);

  const handleOpenCart = useCallback(() => {
    setIsCartOpen(true);
  }, []);

  const handleCloseCart = useCallback(() => {
    setIsCartOpen(false);
  }, []);

  const handleGoToMenu = useCallback(() => {
    setIsCartOpen(false);
    window.setTimeout(() => {
      document.getElementById('menu')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  }, []);

  const handleAddPizza = useCallback((cartItem) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) =>
          item.configurationKey === cartItem.configurationKey
      );

      if (existingItem) {
        return currentCart.map((item) =>
          item.configurationKey === cartItem.configurationKey
            ? {
                ...item,
                quantity: getCartItemQuantity(item) + 1,
              }
            : item
        );
      }

      return [...currentCart, cartItem];
    });

    setSelectedPizza(null);
  }, []);

  function changeQuantity(itemId, change) {
    setCart((currentCart) =>
      currentCart
        .map((item, index) => {
          if (getCartItemId(item, index) !== itemId) {
            return item;
          }

          return {
            ...item,
            quantity: getCartItemQuantity(item) + change,
          };
        })
        .filter(
          (item) =>
            !Number.isInteger(item.quantity) || item.quantity > 0
        )
    );
  }

  function removeFromCart(itemId) {
    setCart((currentCart) =>
      currentCart.filter(
        (item, index) => getCartItemId(item, index) !== itemId
      )
    );
  }

  function clearCart() {
    setCart([]);
  }

  const cartCount = getCartCount(cart);
  const cartTotalCents = getCartTotalCents(cart);

  return (
    <div className="app">
      <header className="header">
        <a className="brand" href="#inicio">
          Pizza D' Jhon
        </a>

        <nav className="navigation">
          <a href="#inicio">Inicio</a>
          <a href="#menu">Menú</a>
          <a href="#contacto">Contacto</a>

          <button
            type="button"
            className="cart-link"
            onClick={handleOpenCart}
            aria-haspopup="dialog"
            aria-expanded={isCartOpen}
          >
            Carrito ({cartCount})
          </button>
        </nav>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-content">
            <p className="hero-label">Hecho para compartir</p>

            <h1>¡Bienvenido a Pizza D' Jhon!</h1>

            <p>
              Descubre nuestras pizzas y encuentra tu favorita.
            </p>

            <a className="primary-button" href="#menu">
              Explorar menú
            </a>
          </div>
        </section>

        <section className="menu-section" id="menu">
          <h2>Nuestro menú</h2>

          {loading && <p>Cargando menú...</p>}

          {error && (
            <div className="menu-error">
              <p>{error}</p>
              <button type="button" onClick={retry}>
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && menu && (
            <>
              {menu.sections.length === 0 ? (
                <p>Actualmente no hay secciones disponibles.</p>
              ) : (
                <div className="menu-sections">
                  {menu.sections.map((section, index) => {
                    const sectionProducts = section.productKeys
                      .map((key) => productsByKey.get(key))
                      .filter(Boolean);

                    return (
                      <MenuSection
                        key={section.key}
                        section={section}
                        products={sectionProducts}
                        defaultOpen={index === 0}
                        onSelectProduct={handleSelectProduct}
                      />
                    );
                  })}
                </div>
              )}

              <p className="menu-service-note">
                {menu.addons.length} adicionales disponibles. Máximo{' '}
                {menu.limits.maxQuantityPerAddon} por adicional y{' '}
                {menu.limits.maxAddonUnitsPerPizza} por pizza.
              </p>
            </>
          )}
        </section>

        <section className="cart-section" id="carrito">
          <h2>Tu carrito</h2>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="remove-button"
            >
              Vaciar carrito
            </button>
          )}

          {cart.length === 0 ? (
            <p>Tu carrito está vacío. ¡Elige tus pizzas favoritas!</p>
          ) : (
            <div className="cart-list">
              {cart.map((item, index) => (
                <CartItem
                  key={`${getCartItemId(item, index)}-${index}`}
                  item={item}
                  index={index}
                  onChangeQuantity={changeQuantity}
                  onRemove={removeFromCart}
                />
              ))}

              <div className="cart-summary">
                <h3>Total: {formatCents(cartTotalCents)}</h3>
              </div>
            </div>
          )}
        </section>

        <section className="contact-section" id="contacto">
          <h2>Contacto</h2>
          <p>¡Estamos aquí para atenderte!</p>
        </section>
      </main>

      <footer className="footer">
        <p>
          &copy; {currentYear} Pizza D' Jhon.
          Todos los derechos reservados.
        </p>
      </footer>

      {selectedPizza && menu && (
        <PizzaConfigurator
          key={`${selectedPizza.product.key}-${selectedPizza.presentationKey}`}
          product={selectedPizza.product}
          presentationKey={selectedPizza.presentationKey}
          sectionName={selectedPizza.sectionName}
          menu={menu}
          onClose={handleCloseConfigurator}
          onAdd={handleAddPizza}
        />
      )}

      {isCartOpen && (
        <CartDrawer
          cart={cart}
          onClose={handleCloseCart}
          onChangeQuantity={changeQuantity}
          onRemove={removeFromCart}
          onClear={clearCart}
          onGoToMenu={handleGoToMenu}
        />
      )}
    </div>
  );
}

export default App;
