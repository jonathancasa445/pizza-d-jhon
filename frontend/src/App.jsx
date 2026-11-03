
import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [currentYear] = useState(() => new Date().getFullYear());
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('pizza-cart');

      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error('Error al recuperar el carrito:', error);
      return [];
    }
  });

  useEffect(() => {
    async function getProducts() {
      try {
        const response = await fetch(
          'http://localhost:3000/api/products'
        );

        if (!response.ok) {
          throw new Error('No se pudieron obtener los productos.');
        }

        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error al obtener productos:', error);
        setError('No fue posible cargar el menú.');
      } finally {
        setLoading(false);
      }
    }

    getProducts();
  }, []);

  useEffect(() => {
    localStorage.setItem('pizza-cart', JSON.stringify(cart));
  }, [cart]);

  function addToCart(product) {
    setCart((currentCart) => {
      const existingProduct = currentCart.find(
        (item) => item._id === product._id
      );

      if (existingProduct) {
        return currentCart.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...currentCart,
        { ...product, quantity: 1 },
      ];
    });
  }

  function changeQuantity(productId, change) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item._id === productId
            ? { ...item, quantity: item.quantity + change }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId) {
    setCart((currentCart) =>
      currentCart.filter((item) => item._id !== productId)
    );
  }

  function clearCart() {
    setCart([]);
  }

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

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
          <a href="#carrito">
            Carrito ({cartCount})
          </a>
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

          {loading && <p>Cargando productos...</p>}

          {error && <p>{error}</p>}

          {!loading && !error && products.length === 0 && (
            <p>Actualmente no hay productos disponibles.</p>
          )}

          {!error && (
            <div className="product-list">
              {products.map((product) => (
                <article
                  className="product-card"
                  key={product._id}
                >
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                    />
                  )}

                  <h3>{product.name}</h3>

                  <p>{product.description}</p>

                  {product.ingredients.length > 0 && (
                    <p>
                      <strong>Ingredientes:</strong>{' '}
                      {product.ingredients.join(', ')}
                    </p>
                  )}

                  <p className="product-price">
                    ${product.price.toFixed(2)}
                  </p>

                  <button
                    type="button"
                    onClick={() => addToCart(product)}>
                    Añadir al carrito
                  </button>
                </article>
              ))}
            </div>
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
              {cart.map((item) => (
                <article className="cart-item" key={item._id}>
                  <div>
                    <h3>{item.name}</h3>
                    <p>Precio: ${item.price.toFixed(2)}</p>
                    <div className="quantity-controls">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item._id, -1)}
                        aria-label={`Disminuir cantidad de ${item.name}`}
                      >
                        −
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        type="button"
                        onClick={() => changeQuantity(item._id, 1)}
                        aria-label={`Aumentar cantidad de ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <p className="cart-item-total">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>

                  <button
                    type="button"
                    className="remove-button"
                    onClick={() => removeFromCart(item._id)}
                  >
                    Eliminar
                  </button>

                </article>
              ))}

              <div className="cart-summary">
                <h3>Total: ${cartTotal.toFixed(2)}</h3>
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
    </div>
  );
}

export default App;