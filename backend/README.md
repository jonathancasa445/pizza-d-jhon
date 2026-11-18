# Backend — Pizza D' Jhon

Este documento describe la configuración y las herramientas de las Fases 1 y 2.
No contiene credenciales ni valores reales de variables de entorno.

La Fase 2 agrega el catálogo público nuevo sin modificar el frontend actual.
El endpoint legado `GET /api/products` sigue mostrando los tres productos
antiguos. El catálogo nuevo se consulta en `GET /api/menu`.

## Requisitos

- Node.js y npm.
- Una base de datos MongoDB Atlas accesible.
- El archivo `backend/.env` configurado localmente.

## Instalación

```bash
cd backend
npm install
```

## Comandos actuales

```bash
npm start            # inicia el servidor
npm run dev          # inicia el servidor con recarga automática
npm test             # pruebas unitarias del servicio de menú
npm run db:seed      # dry-run del catálogo nuevo
npm run db:indexes   # dry-run de índices
npm run db:restore   # dry-run de restauración
```

## Variables de entorno

El backend lee `backend/.env`. Las variables previstas son:

| Variable | Uso | Fase |
|---|---|---|
| `MONGODB_URI` | Cadena de conexión a MongoDB Atlas | Actual |
| `PORT` | Puerto del servidor | Actual |
| `NODE_ENV` | `development` o `production` | Actual |
| `CLIENT_ORIGINS` | Orígenes exactos permitidos en CORS, separados por coma; el servidor ya lo utiliza | Actual |
| `JWT_SECRET` | Firma de tokens administrativos (obligatorio en producción) | Fase 5 |
| `JWT_EXPIRES_IN` | Duración de la sesión administrativa (`8h` por defecto) | Fase 5 |

El valor por defecto de `CLIENT_ORIGINS` incluye `http://localhost:5173` y
`http://localhost:5177`. No se deben incluir valores reales en `.env.example`,
en Git ni en la documentación.

No se deben incluir valores reales en `.env.example`, en Git ni en la
documentación. El archivo `.env` está ignorado por Git.

## Inspección de la base de datos

```bash
npm run db:inspect
```

Es una operación de **solo lectura**. Muestra:

- Colecciones y cantidad de documentos.
- Índices actuales.
- Documentos de la colección `products`.
- Campos encontrados y sus tipos.
- Precios, categorías y disponibilidad.
- Posibles duplicados por nombre, nombre+precio y `key`.

No modifica documentos ni crea índices.

## Respaldo

```bash
npm run db:backup
```

Exporta la colección `products` a `backend/backups/` en Extended JSON.
El respaldo de la Fase 2 incluye únicamente la colección `products`, que es
la que contiene los tres documentos antiguos que deben preservarse.
También genera un archivo `.meta.json` con:

- Colección incluida.
- Cantidad de documentos.
- Tamaño del archivo.
- SHA-256.
- Fecha de creación.
- Confirmación de verificación.

El respaldo es de solo lectura sobre MongoDB. La carpeta `backend/backups/`
está ignorada por Git porque contiene datos de la base.

El archivo es un respaldo lógico en Extended JSON. Sirve para auditar y
recuperar los documentos con un script de restauración. Para un respaldo
binario completo se necesitarían las MongoDB Database Tools
(`mongodump`/`mongorestore`), que no están instaladas actualmente.

Para respaldar otra colección:

```bash
npm run db:backup -- --collection=products
```

## API de la Fase 2

### Endpoint legado

```http
GET /api/products
```

Devuelve únicamente los documentos antiguos (`schemaVersion` distinto de 1)
para que el frontend actual siga mostrando los tres productos durante toda
la Fase 2. La forma de la respuesta conserva los campos que ya consume el
frontend: `_id`, `name`, `description`, `ingredients`, `price`, `imageUrl`,
`category` y `available`.

### Catálogo nuevo

```http
GET /api/menu
```

Devuelve:

```json
{
  "sections": [],
  "products": [],
  "addons": [],
  "limits": {
    "maxQuantityPerAddon": 3,
    "maxAddonUnitsPerPizza": 10
  }
}
```

- `sections`: secciones activas ordenadas, con `startingPriceCents` y
  `productKeys`.
- `products`: productos nuevos disponibles (`schemaVersion: 1`) que tengan al
  menos una variante con precio y que pertenezcan a una sección activa.
- `addons`: adicionales disponibles. El catálogo inicial usa
  `priceCents: 100` para los nueve adicionales; la API sigue admitiendo
  `priceCents: null` para precios pendientes.
- Cada adicional incluye `purchasable`: es `true` solo si está disponible y
  tiene un `priceCents` entero mayor o igual a 0. Es `false` si el precio es
  `null` o el adicional no está disponible.

Los precios se expresan en centavos enteros. `priceCents: null` significa
"Precio por definir" y no debe interpretarse como gratuito. Si en el futuro
se agrega un adicional con precio pendiente, seguirá visible en el catálogo
con `purchasable: false`.

### Detalle de producto

```http
GET /api/products/:key
```

Devuelve el producto nuevo y los adicionales aplicables. Responde `404` si
el producto no existe o no está disponible.

## Seed del catálogo

El seed está preparado con el catálogo comercial definitivo, pero **no se ha
ejecutado sobre la base real**.

El catálogo inicial contiene:

- 6 secciones;
- 7 pizzas con nombres comerciales, ingredientes, descripciones e imágenes;
- 9 adicionales con `priceCents: 100` (USD 1.00), `maxQuantity: 3` y límite
  global de 10 unidades por pizza.

Las imágenes se leen desde `frontend/public/images/menu/pizzas/` y el dry-run
verifica que las siete rutas existan.

```bash
npm run db:seed
```

Sin `--apply`:

- Valida las claves únicas.
- Valida los documentos con los modelos de Mongoose.
- Valida precios en centavos enteros o `null`.
- Valida la configuración de la pizza mixta.
- Verifica que existan las imágenes de las pizzas.
- Muestra un resumen.
- **No se conecta a MongoDB.**

Para aplicar los cambios de forma idempotente, cuando exista autorización
explícita:

```bash
npm run db:seed -- --apply
```

El seed:

- Hace `upsert` por `key`.
- No elimina documentos.
- No modifica documentos antiguos que no tengan `key`.
- No reemplaza los productos actuales.
- No crea índices automáticamente.

El seed no agrega cargos automáticos por "extra queso" o "extra jamón": esos
ingredientes forman parte de la receta y del precio de la pizza. Los
adicionales solo se cobran si el cliente los selecciona.

## Índices controlados

Los modelos usan `autoIndex: false` y `autoCreate: false` para que una simple
lectura o prueba no cree colecciones ni índices. Los índices se crean
únicamente con:

```bash
npm run db:indexes
```

Sin `--apply`:

- Conecta en modo lectura.
- Revisa claves duplicadas y documentos incompatibles.
- Muestra los índices que se crearían.
- **No crea ni modifica índices.**

Con autorización explícita:

```bash
npm run db:indexes -- --apply
```

El script usa `createIndexes()` y no elimina índices existentes. Antes de
crear índices únicos por `key`, aborta si encuentra claves duplicadas o
documentos incompatibles.

## Restauración controlada

```bash
npm run db:restore
```

Sin `--apply` es un dry-run de solo lectura. Compara el respaldo con MongoDB
y reporta qué documentos crearía, actualizaría, dejaría sin cambios u
omitiría por tener datos más recientes en la base.

```bash
npm run db:restore -- --file=backups/products-....json --apply
```

- Restaura por `_id`.
- No elimina documentos que no estén en el respaldo.
- Verifica SHA-256 y conteo contra la metadata.
- No sobrescribe documentos más recientes sin
  `--allow-overwrite-newer`.
- La colección por defecto es `products`; se puede indicar otra con
  `--collection=...`. El respaldo actual contiene `products`.

## Documentos legacy

Los tres documentos actuales se conservan. El script
`db:mark-legacy` está preparado para la Fase 3, pero no debe aplicarse en la
Fase 2:

```bash
npm run db:mark-legacy
```

Sin `--apply` solo muestra los candidatos. La aplicación real requiere
`--apply --confirm-legacy` y queda aplazada a la Fase 3. Solo modifica
`legacy`, `available`, `schemaVersion` y `legacyAt`; no toca nombres,
descripciones, ingredientes, precios, imágenes, fechas originales ni `_id`.

## Datos del catálogo inicial

El seed contiene el catálogo comercial definitivo:

- Seis secciones: pizzas familiares, pizzas medianas, pizzas de borde,
  alitas, acompañantes y bebidas.
- Seis pizzas normales y una pizza mixta, con nombres comerciales,
  ingredientes y descripciones aprobadas.
- Tres presentaciones por pizza: familiar USD 10.00, mediana USD 5.00 y
  de borde USD 12.00.
- Nueve adicionales con `priceCents: 100` (USD 1.00) y `maxQuantity: 3`.
- Las secciones de alitas, acompañantes y bebidas quedan vacías.
- La pizza mixta exige exactamente dos sabores diferentes y usa
  `allowedFlavorKeys: null` para permitir todos los sabores normales
  disponibles. Una lista vacía no permite ninguno; una lista permite solo
  las claves indicadas. Una mixta no puede elegirse como sabor de otra mixta.

Las siete imágenes se encuentran en `frontend/public/images/menu/pizzas/` y
el seed verifica que existan. El extra queso y el extra jamón de las recetas
están incluidos en el precio de esas pizzas; no se agregan como cargos
automáticos.

## Precisión monetaria

Los precios nuevos se preparan como centavos enteros:

- `1000` = USD 10.00.
- `500` = USD 5.00.
- `1200` = USD 12.00.
- `null` = precio pendiente, nunca gratuito.

El servidor será la fuente de verdad al crear pedidos en una etapa
posterior.

## Seguridad para Netlify + Render

En la Etapa 0 de la Fase 5 ya quedó preparada la infraestructura de
seguridad. Las rutas de autenticación y el panel se implementarán en etapas
posteriores.

- CORS usa orígenes exactos desde `CLIENT_ORIGINS` con `credentials: true`.
- Se monta `cookie-parser`, cabeceras de seguridad básicas y
  `app.set('trust proxy', 1)` solo en producción.
- Cookies previstas: `HttpOnly`, `Secure` en producción, `SameSite=Lax` y
  `Path=/`, **sin atributo `Domain`**. En desarrollo no se usa `Secure` para
  que funcionen sobre `http://localhost`.
- Se previó la sustitución de `SameSite=None` por `SameSite=Lax` gracias al
  proxy de API de Netlify: el navegador ve un único origen, por lo que no
  dependemos de cookies de terceros (bloqueadas por Chrome/Safari).
- CSRF de doble envío preparado en `middleware/csrf.js` (cookie legible +
  cabecera `X-CSRF-Token`, comparación en tiempo constante). Se aplicará a
  las rutas que muten estado en la Etapa 4.
- Limitador de tasa en memoria preparado en `middleware/rateLimit.js` para
  login y logout (5 intentos / 15 min). **Se asume una sola instancia de
  Render**; con varias instancias haría falta un almacén compartido.
- `JWT_SECRET` debe ser estable y definirse en Render; HTTPS obligatorio.

### Proxy de API en Netlify

`frontend/netlify.toml` contiene el rewrite SPA y un bloque de proxy
`/api/*` preparado. La URL real del backend Render **no está documentada en
este repositorio**, por lo que no se inventó ningún dominio: completa el
marcador antes de desplegar y descomenta el bloque, que debe permanecer
antes del rewrite catch-all.

En desarrollo, `frontend/vite.config.js` redirige `/api/*` a
`http://localhost:3000`, por lo que `ordersApi.js` usa rutas relativas
configurables mediante `VITE_API_BASE_URL`. `menuApi.js` conserva su URL
absoluta y sigue funcionando mediante CORS.

## Fase 2

Esta fase implementa los modelos, el servicio, las rutas y los scripts del
catálogo nuevo. No modifica el frontend, no implementa autenticación, panel
administrativo, pedidos ni carrito, y no aplica cambios sobre MongoDB sin
autorización explícita.

Los tres documentos antiguos siguen disponibles y no se marcan como legacy
hasta la Fase 3.
