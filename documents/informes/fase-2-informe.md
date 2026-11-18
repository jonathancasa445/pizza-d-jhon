# Informe de Fase 2 — Catálogo nuevo

Fecha: 2026-11-17

## Resumen

Se implementó la Fase 2 del catálogo nuevo sin modificar el frontend, sin
autenticación, sin panel administrativo, sin pedidos y sin carrito nuevo.

Además, el seed se actualizó con el catálogo comercial definitivo: nombres,
ingredientes, descripciones, imágenes y precio de los adicionales. El dry-run
verifica las siete imágenes y no escribe en MongoDB.

No se aplicó el seed, no se crearon índices, no se restauró la base y no se
marcaron los productos antiguos como legacy. Los tres documentos actuales
siguen disponibles y `GET /api/products` sigue devolviéndolos.

## Archivos creados

- `backend/src/constants/catalog.js`
- `backend/src/utils/money.js`
- `backend/src/models/MenuSection.js`
- `backend/src/models/Addon.js`
- `backend/src/services/menuService.js`
- `backend/src/controllers/menuController.js`
- `backend/src/routes/menuRoutes.js`
- `backend/scripts/restore-products.js`
- `backend/scripts/sync-indexes.js`
- `backend/scripts/mark-legacy-products.js`
- `backend/tests/menuService.test.js`
- `backend/tests/seedCatalog.test.js`

## Archivos modificados

- `backend/src/models/Product.js`
- `backend/src/routes/productRoutes.js`
- `backend/src/server.js`
- `backend/scripts/seed-catalog.js`
- `backend/package.json`
- `backend/README.md`

No se modificó ningún archivo de `frontend/`.

## Modelos y reglas implementadas

- `Product` conserva los campos legacy `price` y `category` para leer los
  documentos antiguos.
- Los productos nuevos usan `schemaVersion: 1`, `legacy: false` y variantes
  con `priceCents` entero.
- `priceCents: null` significa "Precio por definir"; nunca se trata como 0.
- Los modelos usan `autoIndex: false` y `autoCreate: false`.
- El índice único de `Product.key` es parcial y solo aplica a `key` de tipo
  string, por lo que los tres documentos legacy sin `key` no bloquean la
  creación del índice.
- `MenuSection` distingue secciones de presentación de pizza y secciones
  estándar.
- `Addon` tiene `maxQuantity: 3` por adicional.
- Cada adicional serializado incluye `purchasable`:
  - `true` solo si está disponible y tiene `priceCents` entero mayor o igual
    a 0;
  - `false` si `priceCents` es `null` o el adicional no está disponible.
- Si un adicional tiene precio pendiente, sigue visible en `/api/menu`.
- La respuesta de `/api/menu` expone los límites:
  - máximo 3 unidades por adicional;
  - máximo 10 unidades de adicionales por pizza.
- La pizza mixta exige exactamente dos sabores diferentes.
- `mixConfig.allowedFlavorKeys` conserva estos significados:
  - `null`: todos los sabores normales disponibles;
  - `[]`: ningún sabor;
  - lista: solo las claves indicadas.
- El seed de la mixta usa `allowedFlavorKeys: null`.
- Las pizzas mixtas no se consideran sabores normales para otra mixta.

## Catálogo inicial definitivo del seed

El seed conserva las claves técnicas y contiene 6 secciones, 7 pizzas y 9
adicionales.

| Clave técnica | Nombre comercial | Imagen |
|---|---|---|
| `pizza-jamon` | Amantes al Jamón | `/images/menu/pizzas/amantes-al-jamon.jpg` |
| `pizza-pepperoni` | Amantes al Pepperoni | `/images/menu/pizzas/amantes-al-pepperoni.jpg` |
| `pizza-continental` | Continental | `/images/menu/pizzas/continental.jpg` |
| `pizza-hawaiana` | Hawaiana | `/images/menu/pizzas/hawaiana.jpg` |
| `pizza-amante-a-la-carne` | Amantes a la Carne | `/images/menu/pizzas/amantes-a-la-carne.jpg` |
| `pizza-suprema` | Super Suprema | `/images/menu/pizzas/super-suprema.jpg` |
| `pizza-mixta` | Mixta | `/images/menu/pizzas/mixta.jpg` |

### Ingredientes por pizza

- `pizza-jamon`: salsa pizza, queso mozzarella, mucho jamón y extra queso.
- `pizza-pepperoni`: salsa pizza, queso mozzarella, mucho pepperoni y extra
  queso.
- `pizza-continental`: salsa pizza, queso mozzarella, jamón, chorizo, pimiento
  y champiñón.
- `pizza-hawaiana`: salsa pizza, queso mozzarella, jamón, piña y extra jamón.
- `pizza-amante-a-la-carne`: salsa pizza, queso mozzarella, jamón, pepperoni,
  salami y tocino.
- `pizza-suprema`: salsa pizza, queso mozzarella, jamón, pepperoni, chorizo y
  mix de vegetales (pimiento, cebolla y champiñón).
- `pizza-mixta`: sin receta fija; depende de los dos sabores seleccionados.

### Presentaciones y mixta

- Familiar: 1000 centavos (USD 10.00).
- Mediana: 500 centavos (USD 5.00).
- De borde: 1200 centavos (USD 12.00).
- Mixta: exactamente dos sabores normales diferentes, mitad y mitad, sin
  recargo por combinar y con adicionales permitidos.

### Adicionales

Los nueve adicionales tienen `priceCents: 100` (USD 1.00), `maxQuantity: 3` y
límite global de 10 unidades por pizza:

- Queso extra
- Jamón extra
- Pepperoni extra
- Piña
- Tocino
- Chorizo
- Mix de vegetales
- Champiñón
- Salami

El extra queso y el extra jamón que aparecen en las recetas ya están incluidos
en el precio habitual de esas pizzas. No se agregan como cargos automáticos;
solo se cobran si el cliente selecciona el adicional.

## API implementada

### `GET /api/products`

Endpoint legado. Devuelve únicamente documentos con `schemaVersion` distinto
de 1, es decir, los tres productos antiguos. La respuesta conserva los campos
que usa el frontend actual.

Resultado local:

- Estado: `200`
- Documentos: 3
- Productos: Pizza clásica, Pizza especial y Pizza familiar
- Precios legacy: 10, 12 y 15

### `GET /api/menu`

Catálogo nuevo. Resultado local sin seed aplicado:

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

El catálogo está vacío porque el seed no se aplicó a MongoDB. La lógica de
agrupación, precios desde, exclusiones y mixta se validó con pruebas
unitarias y fixtures.

### `GET /api/products/:key`

Detalle de producto nuevo. Resultado local sin seed:

- `/api/products/pizza-jamon`: `404 Producto no encontrado.`
- `/api/products/INVALID`: `400 La clave del producto no es válida.`

## Pruebas ejecutadas

### Pruebas unitarias

```bash
npm test
```

Resultado: 21 pruebas aprobadas, 0 fallidas.

Cubren:

- agrupación por secciones;
- cálculo de `startingPriceCents`;
- exclusión de legacy, no disponibles y productos sin precio;
- producto con una presentación sin precio;
- `allowedFlavorKeys: null` en la mixta, tanto en la respuesta como en el
  modelo de Mongoose;
- adicionales con `priceCents: null` y `maxQuantity: 3`;
- `purchasable: false` para adicionales con precio pendiente;
- `purchasable: true` para adicionales disponibles con precio entero válido,
  incluido el precio 0;
- `purchasable: false` para adicionales no disponibles aunque tengan precio;
- límites globales de adicionales;
- serialización sin campos internos/legacy;
- claves válidas como `pizza-jamon` y `pizzas-familiares`;
- rechazo de claves con caracteres inválidos o asteriscos;
- datos del seed: 6 secciones, 7 pizzas y 9 adicionales;
- nombres, ingredientes, descripciones e imágenes aprobadas;
- adicionales con `priceCents: 100` y `maxQuantity: 3`;
- existencia de las siete rutas de imágenes;
- validación completa del seed con Mongoose y archivos de imagen.

### Seed en dry-run

```bash
npm run db:seed
```

Resultado:

- 6 secciones;
- 7 productos (6 normales y 1 mixta);
- 9 adicionales con `priceCents: 100`;
- 7 imágenes verificadas;
- validación con modelos de Mongoose correcta;
- no se conectó a MongoDB;
- no se escribió nada.

### Índices en dry-run

```bash
npm run db:indexes
```

Resultado:

- `products`: 3 documentos, 0 claves duplicadas, 3 documentos legacy sin key;
- `menusections`: 0 documentos;
- `addons`: 0 documentos;
- no se creó ni modificó ningún índice.

### Restauración en dry-run

```bash
npm run db:restore
```

Respaldo utilizado:

- `backend/backups/products-2026-11-14T21-59-02-683Z.json`
- SHA-256: `9eba218c709cfc8f753217eaa561f6e627edd3698196656a90e3f6c1938e941a`
- Documentos: 3
- Resultado: 3 documentos sin cambios, 0 creados, 0 actualizados.
- No se modificó MongoDB.

### Marcado legacy en dry-run

```bash
npm run db:mark-legacy
```

Resultado:

- 3 candidatos;
- no se modificó ningún documento;
- la aplicación real queda aplazada a Fase 3.

## Estado de MongoDB

Estado observado al finalizar:

- `products`: 3 documentos.
- `addons`: 0 documentos.
- `menusections`: 0 documentos.
- Índices actuales en `products`: solo `_id_`.
- Los tres documentos antiguos conservan sus nombres, descripciones,
  ingredientes, precios, categorías, imágenes y fechas.
- No se eliminó ningún documento.
- No se marcó ningún documento como legacy.
- No se aplicó el seed.
- No se crearon índices del catálogo nuevo.

### Incidencia a revisar

Las colecciones vacías `addons` y `menusections` aparecen en la inspección
final. Es probable que hayan sido creadas por la opción `autoCreate` de
Mongoose (activa por defecto) durante las pruebas de lectura de los modelos.
No contienen documentos y no afectan a `/api/products` ni a los datos
existentes.

Ya se agregó `autoCreate: false` a los modelos para evitar que vuelva a
ocurrir. No se eliminaron las colecciones vacías porque borrar colecciones
es una operación destructiva y requiere autorización explícita.

## Pendiente de autorización

No se ejecutó ninguna de estas operaciones:

```bash
npm run db:seed -- --apply
npm run db:indexes -- --apply
npm run db:restore -- --apply
npm run db:mark-legacy -- --apply --confirm-legacy
```

Para continuar se requiere autorización expresa. También queda pendiente
decidir si se eliminan las dos colecciones vacías creadas durante las
pruebas de lectura.

No se avanzó a la Fase 3.
