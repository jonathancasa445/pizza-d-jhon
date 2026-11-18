# FASE 5 — ETAPA 4: API administrativa protegida

Implementar exclusivamente la Etapa 4 de la Fase 5 de Pizza D' Jhon.

## 1. Contexto obligatorio

El proyecto utiliza:
- Node.js.
- Express 5.
- Mongoose 9.
- MongoDB Atlas.
- Pruebas con node:test.

Etapas completadas:
- Etapa 0: configuración y seguridad.
- Etapa 1: modelo Admin y CLI.
- Etapa 2: autenticación y sesiones administrativas.
- Etapa 3: gestión de pedidos y lógica administrativa.

Revisa el código real antes de modificarlo. No supongas nombres de funciones, archivos ni contratos: reutiliza los servicios existentes.

Documentos de referencia:
- `documents/prompts/fases/FASE_5_ET4.md`
- `backend/src/services/adminOrderService.js`
- `backend/src/services/orderStatusService.js`
- `backend/src/services/orderAdminSerializer.js`
- `backend/src/middleware/requireAuth.js`
- `backend/src/routes/adminAuthRoutes.js`
- `backend/src/controllers/adminAuthController.js`
- `backend/src/middleware/csrf.js`
- `backend/src/server.js`

## 2. Objetivo

Crear la API administrativa protegida que conectará la autenticación de la Etapa 2 con la lógica de pedidos de la Etapa 3.

## 3. Endpoints requeridos

Implementar:

### GET /api/admin/orders
- Requiere administrador autenticado.
- Permite paginación.
- Permite filtrar por estado.
- Respeta los límites y valores predeterminados definidos en la Etapa 3.
- Valida parámetros y responde con errores claros.

### GET /api/admin/orders/stats
- Requiere administrador autenticado.
- Devuelve las estadísticas calculadas por el servicio de la Etapa 3.
- Conserva la clasificación `unclassified` si corresponde.

### GET /api/admin/orders/:id
- Requiere administrador autenticado.
- Valida el identificador.
- Devuelve el detalle completo del pedido y su historial.
- Responde correctamente cuando el pedido no existe.

### PATCH /api/admin/orders/:id/status
- Requiere administrador autenticado.
- Requiere protección CSRF.
- Acepta únicamente el nuevo estado y el motivo cuando corresponda.
- Obtiene `adminId` exclusivamente de `req.admin`, establecido por `requireAuth`.
- Nunca acepta `adminId` o `changedBy` desde el body.
- Delega la validación de estados, motivos y concurrencia al servicio `orderStatusService`.
- No permite modificar otros datos del pedido.

## 4. Seguridad

- Todas las rutas administrativas deben utilizar `requireAuth`.
- No confíes en identificadores de administrador proporcionados por el cliente.
- Protege el PATCH con el mecanismo CSRF ya implementado.
- No dupliques la lógica de autenticación.
- No implementes autenticación global que interfiera con las rutas públicas.
- No expongas información sensible.
- No devuelvas stack traces ni detalles internos en errores de producción.
- Conserva las cookies y configuración de sesión de la Etapa 2.

## 5. Respuestas y errores

Establece respuestas JSON coherentes para:
- Solicitud incorrecta: 400.
- Sesión inexistente o inválida: 401.
- CSRF inválido: 403.
- Pedido inexistente: 404.
- Transición inválida o conflicto de estado: utiliza los códigos y errores definidos por los servicios de la Etapa 3.
- Errores inesperados: 500 sin filtrar detalles internos en producción.

Evita duplicar códigos y mensajes de error si ya están definidos.

## 6. Pruebas obligatorias

Añade pruebas automatizadas para verificar:

1. Acceso sin sesión: 401 en todos los endpoints administrativos.
2. Acceso con sesión válida.
3. Listado, paginación y filtros.
4. Consulta de estadísticas.
5. Consulta de detalle.
6. Identificador inválido y pedido inexistente.
7. Cambio de estado válido.
8. Cambio de estado con motivo obligatorio.
9. Rechazo de transiciones inválidas.
10. Rechazo de CSRF inválido.
11. Verificación de que `adminId` procede de `req.admin` y no del body.
12. Verificación de que el cliente no puede modificar productos, cantidades, precios ni totales.
13. Conflictos de actualización concurrente.
14. Conservación de las rutas públicas de la Fase 4 y autenticación de la Etapa 2.

Utiliza mocks o entornos aislados. No modifiques documentos reales de MongoDB Atlas.

## 7. Restricciones

- No implementar el frontend ni el botón de login: corresponde a la Etapa 5.
- No modificar las reglas funcionales aprobadas en la Etapa 3.
- No crear administradores.
- No ejecutar `admin:create`.
- No modificar documentos ni índices reales de MongoDB.
- No realizar migraciones.
- No alterar el pedido histórico.
- No tocar el stash.
- No modificar archivos fuera del alcance.
- No realizar commits ni push.
- No avanzar a la Etapa 5.

Si descubres una incompatibilidad entre los servicios existentes y los endpoints requeridos, detente y documenta el problema antes de introducir cambios funcionales.

## 8. Informe final

Al terminar, informa:

1. Archivos creados y modificados.
2. Endpoints implementados.
3. Protección de autenticación y CSRF.
4. Origen de `adminId`.
5. Manejo de errores.
6. Pruebas ejecutadas y resultados exactos.
7. Confirmación de que la Fase 4 y la Etapa 2 siguen funcionando.
8. Confirmación de que MongoDB no sufrió modificaciones.
9. Confirmación de que no se crearon administradores.
10. Riesgos o decisiones pendientes.
11. Estado de Git y confirmación de que no hiciste commits ni push.

Implementa exclusivamente esta etapa y espera la revisión del informe final.