import './App.css'

function App() {
return (
<main className="app">
<header className="header">
<a href="/" className="brand">
Pizza D' Jhon
</a>

    <nav className="navigation" aria-label="Navegación principal">
      <a href="#inicio">Inicio</a>
      <a href="#menu">Menú</a>
      <a href="#contacto">Contacto</a>
    </nav>
  </header>

  <section id="inicio" className="hero">
    <div className="hero-content">
      <p className="hero-label">Hechas para compartir</p>

      <h1>Bienvenido a Pizza D' Jhon</h1>

      <p>
        Descubre nuestras pizzas y disfruta de buenos momentos
        con quienes más quieres.
      </p>

      <a href="#menu" className="primary-button">
        Explorar nuestro menú
      </a>
    </div>
  </section>

  <section id="menu" className="menu-section">
    <h2>Nuestro menú</h2>
    <p>
      Próximamente podrás descubrir nuestras pizzas y otros productos.
    </p>
  </section>

  <section id="contacto" className="contact-section">
    <h2>Contáctanos</h2>
    <p>Estamos preparando nuestro espacio para atenderte.</p>
  </section>

  <footer className="footer">
    <p>© {new Date().getFullYear()} Pizza D' Jhon</p>
  </footer>
</main>

)
}

export default App