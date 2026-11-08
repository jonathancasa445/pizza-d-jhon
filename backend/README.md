# Backend — Pizza D' Jhon

Este documento describe la configuración y las herramientas de la Fase 1.
No contiene credenciales ni valores reales de variables de entorno.

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
npm start       # inicia el servidor
npm run dev     # inicia el servidor con recarga automática
```

## Variables de entorno

El backend lee `backend/.env`. Las variables previstas son:

| Variable | Uso | Fase |
|---|---|---|
| `MONGODB_URI` | Cadena de conexión a MongoDB Atlas | Actual |
| `PORT` | Puerto del servidor | Actual |
| `NODE_ENV` | `development` o `production` | Actual |
| `CLIENT_ORIGINS` | Orígenes permitidos, separados por coma | Preparación |
| `JWT_SECRET` | Firma de tokens administrativos | Fase 5 |
| `JWT_EXPIRES_IN` | Duración de la sesión administrativa | Fase 5 |

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
También genera un archivo `.meta.json` con:

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

## Seed del catálogo

El seed está preparado para la nueva estructura, pero **no se ha ejecutado
sobre la base real**.

```bash
npm run db:seed
```

Sin `--apply`:

- Valida las claves únicas.
- Valida precios en centavos enteros o `null`.
- Valida la configuración de la pizza mixta.
- Muestra un resumen.
- **No se conecta a MongoDB.**

Para aplicar los cambios de forma idempotente, cuando la Fase 2 esté
aprobada:

```bash
npm run db:seed -- --apply
```

El seed:

- Hace `upsert` por `key`.
- No elimina documentos.
- No modifica documentos antiguos que no tengan `key`.
- No reemplaza los productos actuales.
- No crea índices únicos automáticamente.

## Datos del catálogo preparado

El seed contiene únicamente información proporcionada:

- Seis secciones: pizzas familiares, pizzas medianas, pizzas de borde,
  alitas, acompañantes y bebidas.
- Seis pizzas normales y una pizza mixta.
- Tres presentaciones por pizza: familiar USD 10.00, mediana USD 5.00 y
  de borde USD 12.00.
- Nueve ingredientes adicionales con precio pendiente (`null`).
- Las secciones de alitas, acompañantes y bebidas quedan vacías.

Las descripciones, ingredientes e imágenes quedan vacíos porque no fueron
proporcionados. El frontend mostrará los textos de placeholder definidos
en la planificación.

## Precisión monetaria

Los precios nuevos se preparan como centavos enteros:

- `1000` = USD 10.00.
- `500` = USD 5.00.
- `1200` = USD 12.00.
- `null` = precio pendiente, nunca gratuito.

El servidor será la fuente de verdad al crear pedidos en una etapa
posterior.

## Seguridad prevista para Netlify + Render

La autenticación administrativa se implementará en la Fase 5. El diseño
debe contemplar dominios distintos:

- CORS con orígenes exactos desde `CLIENT_ORIGINS`.
- `credentials: true` en CORS y `credentials: 'include'` en el frontend.
- Cookie `HttpOnly`, `Secure`, `SameSite=None` y `Path=/`.
- Protección CSRF con token de doble envío y cabecera `X-CSRF-Token`.
- `app.set('trust proxy', 1)` para Render.
- Rate limiting en login y rutas administrativas.
- `JWT_SECRET` estable en el entorno de Render.
- HTTPS obligatorio en producción.

## Fase 1

Esta fase solo prepara la base, el respaldo, la configuración y los scripts.
No modifica el catálogo actual ni ejecuta migraciones definitivas.
