import { useCallback, useEffect, useMemo, useState } from 'react';
import CartDrawer from '../components/CartDrawer';
import MenuSection from '../components/MenuSection';
import PizzaConfigurator from '../components/PizzaConfigurator';
import { useMenu } from '../hooks/useMenu';
import {
  getCartCount,
  getCartItemId,
  getCartItemQuantity,
} from '../utils/cart';
import { navigate } from '../router';

function PublicApp() {
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
        ? parsedCart.filter((item) => item && typeof item === 'object')
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

  const handleAdminLoginClick = useCallback((event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    navigate('/admin/login');
  }, []);

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
        (item) => item.configurationKey === cartItem.configurationKey
      );

      if (existingItem) {
        return currentCart.map((item) =>
          item.configurationKey === cartItem.configurationKey
            ? { ...item, quantity: getCartItemQuantity(item) + 1 }
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
          (item) => !Number.isInteger(item.quantity) || item.quantity > 0
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

  return (
    <div className="app">
      <header className="header">
        <a className="brand" href="#inicio">
          <img
            className="brand-logo"
            src="/images/logos/logo.jpg"
            alt=""
            aria-hidden="true"
          />
          <span>Pizza D' Jhon</span>
        </a>

        <nav className="navigation">
          <a href="#inicio">Inicio</a>
          <a href="#menu">Menú</a>
          <a href="#historia">Nuestra historia</a>
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

          <a href="/admin/login" onClick={handleAdminLoginClick}>
            Iniciar sesión
          </a>
        </nav>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-content">
            <p className="hero-label">De barrio, artesanal y al instante</p>

            <h1>¡Bienvenido a Pizza D' Jhon!</h1>

            <p>
              Pizzas hechas al momento, para compartir en casa o llevar hasta
              tu puerta. Somos familia, somos barrio y seguimos aquí.
            </p>

            <p className="hero-slogan">100 pre caliente</p>

            <a className="primary-button" href="#menu">
              Ver el menú
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
                {menu.limits.maxAddonUnitsPerPizza} por producto.
              </p>
            </>
          )}
        </section>

        <section className="story-section" id="historia">
          <div className="story-inner">
            <div className="story-photo">
              <img
                src="/images/local/imagen_local.jpg"
                alt="Fachada del local de Pizza D' Jhon"
              />
            </div>

            <div className="story-copy">
              <p className="story-eyebrow">Nuestra historia</p>
              <h2>Seguimos aquí, 100 pre caliente</h2>
              <p>
                Pizza D' Jhon nace como un emprendimiento familiar. En los días
                más duros de la pandemia encontramos una forma de seguir cerca
                de nuestra gente: llevando nuestras pizzas hasta los hogares,
                para que todos pudieran disfrutar con tranquilidad.
              </p>
              <p>
                No fue fácil, pero nunca dejamos de hacer lo nuestro. Seguimos
                preparando pizzas artesanales, al instante y sin procesos
                industriales. Somos del barrio, y aquí seguimos.
              </p>
              <p className="story-slogan">
                Gracias por estar ahí. 100 pre caliente.
              </p>
            </div>
          </div>
        </section>

        <section className="contact-section" id="contacto">
          <p className="story-eyebrow">¿Un antojo?</p>
          <h2>Estamos aquí para atenderte</h2>
          <p>Haz tu pedido y lo llevamos hasta donde estés.</p>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <img
              className="footer-logo"
              src="/images/logos/logo.jpg"
              alt=""
              aria-hidden="true"
            />
            <div>
              <p className="footer-brand-name">Pizza D' Jhon</p>
              <p className="footer-slogan">100 pre caliente</p>
              <p>Hecho en el barrio, para el barrio.</p>
            </div>
          </div>

          <div className="footer-block">
            <h3>Contacto</h3>

            <p className="footer-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.22 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <a href="tel:+593967715368">+593 96 771 5368</a>
            </p>

            <p className="footer-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
              </svg>
              <a
                href="https://wa.me/593967715368"
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            </p>

            <p className="footer-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 6-10 7L2 6" />
              </svg>
              <a href="mailto:JonathanCasa77@gmail.com">
                JonathanCasa77@gmail.com
              </a>
            </p>
          </div>

          <div className="footer-block">
            <h3>Dónde estamos</h3>
            <p className="footer-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>
                Batallón del Suburbio, 23 y la P, Guayaquil, Ecuador.
              </span>
            </p>
          </div>

          <div className="footer-block">
            <h3>Horarios</h3>
            <p className="footer-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span>
                Domingo a jueves: 17:00–22:30.
                <br />
                Viernes y sábado: 15:00–23:59.
              </span>
            </p>
          </div>

          <div className="footer-block">
            <h3>Facebook</h3>
            <p className="footer-item">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
              <a
                href="https://www.facebook.com/p/Pizza-DJohn-100054617747006/?locale=es_LA"
                target="_blank"
                rel="noopener noreferrer"
              >
                Pizza D’John
              </a>
            </p>
          </div>
        </div>

        <p className="footer-copyright">
          &copy; {currentYear} Pizza D' Jhon. 100 pre caliente.
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

export default PublicApp;
