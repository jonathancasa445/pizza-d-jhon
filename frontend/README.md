# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Configuración del proyecto (Pizza D' Jhon)

### Variables de entorno

Copia `.env.example` a `.env` y ajusta:

- `VITE_WHATSAPP_PHONE`: número internacional, sin `+` ni espacios.
- `VITE_API_BASE_URL`: base de la API. Déjalo vacío para usar rutas
  relativas `/api/...` (recomendado). Solo indícalo si el backend está en
  otro origen y no se usa el proxy.

### Desarrollo

`vite.config.js` redirige `/api/*` a `http://localhost:3000`. El registro de
pedidos (`ordersApi.js`) ya usa la ruta relativa `/api/orders` y la base
configurable `VITE_API_BASE_URL`. El catálogo (`menuApi.js`) mantiene su URL
absoluta de desarrollo y sigue funcionando por CORS; su adaptación al proxy
no estaba incluida en el trabajo autorizado de esta etapa.

El backend sigue aceptando los orígenes `http://localhost:5173` y
`http://localhost:5177` con CORS y `credentials`.

### Producción (Netlify)

`netlify.toml` incluye el rewrite SPA y un bloque de proxy `/api/*` hacia
Render que debe completarse con la URL real del servicio (no documentada en
este repositorio). El proxy debe ir antes del rewrite catch-all para que las
peticiones de API no se sirvan como `index.html`.
