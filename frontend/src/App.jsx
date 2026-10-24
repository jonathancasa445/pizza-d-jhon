
import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

                  <button type="button">
                    Añadir al carrito
                  </button>
                </article>
              ))}
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
          &copy; {new Date().getFullYear()} Pizza D' Jhon.
          Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}

export default App;