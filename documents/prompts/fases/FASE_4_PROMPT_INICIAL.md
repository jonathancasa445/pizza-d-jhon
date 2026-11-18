# FASE 4 — IMPLEMENTACIÓN DEL REGISTRO DE PEDIDOS

## 1. Objetivo

Implementar el registro persistente de pedidos en MongoDB mediante un nuevo endpoint `POST /api/orders`.

El flujo será:

1. El cliente completa el checkout.
2. El frontend envía los datos del pedido al backend.
3. El backend valida los productos y configuraciones utilizando el catálogo de MongoDB.
4. El backend calcula todos los precios y totales.
5. Se registra el pedido en MongoDB con estado inicial `pending`.
6. El frontend muestra la confirmación con el identificador y el total devuelto por el servidor.
7. Se habilita un botón para abrir WhatsApp con el mensaje generado a partir de la orden registrada.

**IMPORTANTE:** Registrar un pedido no significa que se haya realizado una venta. Los pedidos `pending` no deben contabilizarse como ventas. La gestión manual de estados se implementará en una futura fase administrativa.

## 2. Reglas de trabajo

- Implementa únicamente las funcionalidades descritas en esta fase.
- Respeta la arquitectura, convenciones y estilos actuales del proyecto.
- Inspecciona los archivos antes de modificarlos.
- Reutiliza las funciones existentes cuando sea apropiado.
- No agregues dependencias.
- No reemplaces código funcional sin justificación.
- No realices refactorizaciones ajenas a esta fase.
- Mantén los cálculos monetarios en centavos enteros.
- No confíes en precios, nombres comerciales ni totales enviados por el frontend.
- No expongas información interna de MongoDB en las respuestas HTTP.
- No compartas ni solicites archivos `.env` o credenciales.
- No realices operaciones destructivas.

## 3. Backend

Implementa los siguientes archivos:

Crear:
- `backend/src/constants/order.js`
- `backend/src/models/Order.js`
- `backend/src/services/orderService.js`
- `backend/src/controllers/orderController.js`
- `backend/src/routes/orderRoutes.js`
- `backend/tests/orderService.test.js`
- `backend/scripts/sync-order-indexes.js`

Modificar:
- `backend/src/server.js`
- `backend/package.json`

### Modelo Order

Debe contener:

- `_id` como identificador de MongoDB.
- `idempotencyKey` obligatorio y único.
- `requestHash` SHA-256 del payload normalizado.
- `customer.name`.
- `modality`: `delivery` o `pickup`.
- `address`.
- `reference`.
- `observations`.
- `items` con snapshots de los productos y sus configuraciones.
- `subtotalCents`.
- `totalCents`.
- `currency: USD`.
- `status: pending` por defecto.
- `createdAt` y `updatedAt`.

Cada elemento de `items` debe almacenar:

- `productKey` y `productName`.
- `presentationKey` y `presentationName`.
- `basePriceCents`.
- `addonsSubtotalCents`.
- `unitPriceCents`.
- `quantity`.
- `lineTotalCents`.
- `isMix`.
- `flavors`: snapshots de clave y nombre.
- `addons`: snapshots de clave, nombre, precio y cantidad.

Los datos comerciales y precios deben obtenerse exclusivamente del catálogo vigente de MongoDB.

Mantén `autoIndex: false` y `autoCreate: false`, siguiendo la configuración actual del proyecto.

### Endpoint

Implementa:

`POST /api/orders`

Cabecera obligatoria:

`Idempotency-Key: <UUID v4>`

El payload no debe aceptar precios ni totales del frontend.

Rechaza campos monetarios no permitidos, en lugar de ignorarlos silenciosamente.

Códigos esperados:

- `201`: pedido creado.
- `200`: solicitud repetida con misma clave y mismo contenido; devolver pedido existente.
- `400`: datos inválidos.
- `409`: misma clave de idempotencia con contenido diferente.
- `500`: error interno sin detalles sensibles.

### Validaciones

Implementa todas las validaciones descritas en el plan aprobado:

- Nombre obligatorio, entre 1 y 80 caracteres.
- Modalidad válida.
- Dirección obligatoria únicamente para delivery.
- Para pickup, guardar dirección vacía.
- Límites razonables de longitud para referencia y observaciones.
- Entre 1 y 50 líneas.
- Cantidad entera entre 1 y 99 por línea.
- Producto disponible, público y no legacy.
- Presentación disponible y con precio válido.
- Validaciones completas de pizzas Mixtas.
- Dos sabores distintos, disponibles y permitidos.
- No permitir que una Mixta sea sabor de otra Mixta.
- Validaciones de adicionales, aplicabilidad y límites.
- Máximo 3 unidades por adicional.
- Máximo 10 unidades de adicionales por pizza.
- Rechazar adicionales duplicados en lugar de sumarlos silenciosamente.

Consulta `getPublicMenu()` y reutiliza las estructuras actuales para validar el catálogo.

### Cálculos

El backend debe calcular:

- Precio base de la presentación.
- Subtotal de adicionales.
- Precio unitario.
- Subtotal de cada línea.
- Subtotal general.
- Total general.

El total será igual al subtotal, ya que todavía no hay costos de envío ni impuestos definidos.

Comprueba que los importes sean enteros seguros y no negativos.

### Idempotencia

Implementa la protección contra solicitudes duplicadas:

1. Validar UUID v4 en la cabecera.
2. Normalizar el payload.
3. Calcular su hash SHA-256.
4. Consultar si ya existe esa clave.
5. Si existe con el mismo hash, devolver la orden existente.
6. Si existe con hash diferente, responder `409`.
7. Si se produce un error de índice duplicado `11000`, recuperar el registro y realizar la misma comparación.

El índice único de `idempotencyKey` debe estar contemplado en el script de índices.

**No ejecutes el script con `--apply`.** Debe permanecer en modo dry-run hasta recibir autorización expresa.

## 4. Frontend

Crear:

- `frontend/src/services/ordersApi.js`
- `frontend/src/utils/orderPayload.js`

Modificar:

- `frontend/src/components/CartDrawer.jsx`
- `frontend/src/utils/orderMessage.js`
- `frontend/src/App.css`

### Envío del pedido

- Generar una clave mediante `crypto.randomUUID()`.
- Enviar únicamente los datos necesarios del cliente y las configuraciones del carrito.
- No enviar precios ni totales como datos confiables.
- Mostrar un estado de carga durante el envío.
- Bloquear dobles clics y solicitudes simultáneas.
- Si falla el backend, mostrar un mensaje comprensible.
- Conservar el carrito y los datos del formulario cuando ocurra un error.

### Clave de idempotencia

La clave debe mantenerse al reintentar exactamente el mismo pedido.

Debe renovarse cuando cambie cualquier dato relevante del pedido:

- Productos.
- Presentaciones.
- Sabores.
- Adicionales.
- Cantidades.
- Nombre.
- Modalidad.
- Dirección.
- Referencia.
- Observaciones.

Evita generar claves diferentes para reintentos del mismo contenido.

Conserva la clave y el estado de éxito mientras el pedido no cambie, incluso si el usuario cierra y vuelve a abrir el drawer. Puedes utilizar el estado de App o `sessionStorage` si resulta necesario.

No permitas que un cambio en el carrito provoque que se reutilice accidentalmente una confirmación anterior.

### Confirmación

Después de recibir una respuesta exitosa:

- Mostrar «Pedido registrado».
- Mostrar identificador del pedido.
- Mostrar estado `pending`.
- Mostrar el total calculado por el servidor.
- No vaciar automáticamente el carrito.
- No afirmar que el mensaje de WhatsApp fue enviado.
- No permitir un segundo registro accidental del mismo pedido.

Si el total del servidor difiere del mostrado previamente en React, mostrar el importe real y explicar que se actualizó según el catálogo vigente.

### WhatsApp

El mensaje debe construirse a partir de la respuesta de la orden registrada, nunca del total calculado por el carrito.

Debe incluir:

- Identificador del pedido.
- Nombre del cliente.
- Modalidad.
- Dirección cuando corresponda.
- Referencia y observaciones.
- Productos y configuraciones.
- Adicionales.
- Total calculado por el servidor.

Utiliza la configuración existente `VITE_WHATSAPP_PHONE`.

Si falta el número o es inválido, el pedido debe seguir registrándose correctamente. En ese caso, muestra un aviso y no habilites la apertura de WhatsApp.

El botón «Abrir WhatsApp» solo debe estar disponible después de registrar correctamente el pedido.

El cliente deberá revisar y enviar manualmente el mensaje.

## 5. Compatibilidad con carrito legacy

El carrito actual todavía puede contener productos antiguos sin `productKey` o `presentationKey`.

No intentes reconstruir ni inventar sus datos.

Si existen elementos legacy, bloquea el envío y muestra un mensaje claro indicando que deben eliminarse y agregarse nuevamente desde el catálogo actual.

No alteres la compatibilidad existente del carrito para su visualización.

## 6. Índices

Crea el script `sync-order-indexes.js` con estas características:

- Dry-run por defecto.
- Mostrar los índices que se crearían.
- Comprobar conflictos antes de aplicar.
- No eliminar índices existentes.
- No modificar índices del catálogo.
- Requerir `--apply` para crear índices.
- Añadir un comando controlado `db:order-indexes` en `backend/package.json`.

El índice único requerido es:

`{ idempotencyKey: 1 }`

No ejecutes `--apply` ni crees índices durante esta implementación.

## 7. Pruebas

Implementa pruebas para:

- Pedido válido de pizza normal.
- Pedido válido de pizza Mixta.
- Recalcular precios correctamente.
- Producto inexistente o no disponible.
- Producto legacy.
- Presentación inválida.
- Sabores incorrectos.
- Mixta como sabor.
- Adicionales inválidos o duplicados.
- Límites de adicionales.
- Dirección de delivery.
- Modalidad pickup.
- Nombre y campos inválidos.
- Intentos de manipulación de precios.
- Reintentos idempotentes.
- Misma clave con contenido diferente.
- Doble clic en frontend.
- Conservación del carrito tras errores y éxitos.
- Confirmación basada en la respuesta del servidor.
- WhatsApp solo después del registro.

Ejecuta las pruebas disponibles, `npm run lint` y `npm run build` donde corresponda.

No realices envíos reales a WhatsApp.

## 8. Restricciones absolutas

No realizar ninguna de estas acciones:

- Modificar productos, adicionales o secciones del catálogo.
- Ejecutar seeds.
- Modificar documentos existentes de MongoDB.
- Aplicar índices.
- Eliminar colecciones o documentos.
- Implementar pagos.
- Implementar autenticación.
- Crear panel administrativo.
- Implementar Gemini.
- Implementar despliegue.
- Migrar a React Router.
- Cambiar la estructura general del proyecto sin necesidad.

No modifiques archivos `.env` ni solicites sus contenidos.

## 9. Informe final obligatorio

Al terminar, entrega un informe que incluya:

1. Archivos creados y modificados.
2. Descripción de la implementación.
3. Estructura definitiva del modelo Order.
4. Contrato del endpoint y ejemplos de respuestas.
5. Validaciones y cálculos implementados.
6. Protección de idempotencia.
7. Funcionamiento del checkout y WhatsApp.
8. Resultados de pruebas, lint y build.
9. Índices pendientes de aplicar.
10. Riesgos o problemas encontrados.
11. Cualquier decisión que requiera autorización antes de continuar.

**IMPORTANTE: termina después de entregar el informe. No continúes con otras fases ni realices cambios adicionales.**