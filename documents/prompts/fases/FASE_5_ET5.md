# FASE 5 — ETAPA 5: PANEL ADMINISTRATIVO EN REACT

## 1. Objetivo

Implementar el panel administrativo privado de Pizza D' Jhon en React, conectándolo exclusivamente con los endpoints administrativos ya implementados y aprobados en las etapas anteriores.

La interfaz debe permitir que un administrador inicie sesión, consulte estadísticas, visualice pedidos, inspeccione sus detalles e historial y actualice sus estados.

Mantener una estructura sencilla, funcional, mantenible y coherente con el diseño actual de la web pública.

## 2. Auditoría previa obligatoria

Antes de modificar archivos:

1. Revisar la estructura actual del frontend.
2. Revisar App.jsx, App.css y los componentes existentes.
3. Revisar los servicios API actuales, especialmente ordersApi.js y menuApi.js.
4. Revisar los endpoints y contratos de autenticación y pedidos administrativos.
5. Revisar los estilos y convenciones existentes.
6. Identificar incompatibilidades antes de implementar.

No asumir nombres de propiedades ni formatos de respuesta sin verificarlos en el backend.

## 3. Acceso administrativo

Implementar:

- Botón discreto «Iniciar sesión» en la navegación pública.
- Ruta `/admin/login`.
- Formulario con username y password.
- No implementar registro público de administradores.
- Tras autenticación correcta, redirigir a `/admin`.
- Si ya existe una sesión válida, evitar mostrar nuevamente el formulario de login.
- Si se intenta acceder a `/admin` sin sesión válida, redirigir a `/admin/login`.

El resto de la web pública debe seguir funcionando sin autenticación.

## 4. Autenticación y seguridad frontend

Crear un servicio específico para autenticación administrativa.

Consumir:

- GET `/api/admin/auth/csrf`
- POST `/api/admin/auth/login`
- GET `/api/admin/auth/me`
- POST `/api/admin/auth/logout`

Reglas obligatorias:

- Obtener primero el token CSRF antes de realizar login.
- Enviar `X-CSRF-Token` en login y logout.
- Utilizar `credentials: 'include'` en las solicitudes que necesiten cookies.
- El JWT se mantiene exclusivamente en la cookie HttpOnly.
- Nunca guardar JWT, credenciales ni secretos en localStorage o sessionStorage.
- No exponer contraseñas ni tokens en consola.
- Mantener las rutas administrativas protegidas mediante comprobación de sesión.
- Manejar sesiones expiradas y respuestas 401.
- Al cerrar sesión, regresar a la página pública o al login.

No modificar la implementación backend de autenticación.

## 5. Estructura de navegación

Implementar un router-lite sencillo, siguiendo la arquitectura actual del proyecto.

Rutas:

- `/`: página pública actual.
- `/admin/login`: acceso administrativo.
- `/admin`: panel administrativo protegido.

No instalar React Router ni otra biblioteca de enrutamiento.

Respetar navegación mediante enlaces y el historial del navegador, incluyendo los eventos necesarios para navegación atrás/adelante.

No romper las rutas ni funcionalidades públicas existentes.

## 6. Dashboard administrativo

Crear una interfaz administrativa independiente de la presentación pública, manteniendo la identidad visual de Pizza D' Jhon.

Mostrar:

- Total de pedidos.
- Pedidos aceptados.
- Cantidad de pedidos pendientes.
- Cantidad de pedidos confirmados.
- Cantidad de pedidos en preparación.
- Cantidad de pedidos en camino.
- Cantidad de pedidos entregados.
- Cantidad de pedidos cancelados.

No presentar pedidos aceptados como ventas ni inventar cifras monetarias.

Consumir GET `/api/admin/orders/stats`.

## 7. Listado de pedidos

Consumir GET `/api/admin/orders`.

Implementar:

- Tabla o listado adaptable a pantallas pequeñas.
- Identificador del pedido.
- Nombre del cliente.
- Fecha de creación.
- Modalidad: domicilio o retiro.
- Estado actual.
- Acceso al detalle.
- Filtro por estado.
- Paginación.
- Indicador de carga.
- Estado vacío cuando no existan pedidos.
- Manejo de errores.

Usar los parámetros de paginación y filtrado que soporte el backend.

No realizar solicitudes innecesarias ni cargar todos los pedidos simultáneamente.

## 8. Detalle del pedido

Consumir GET `/api/admin/orders/:id`.

Mostrar, según los datos disponibles:

- Información del cliente.
- Modalidad del pedido.
- Dirección y referencia cuando correspondan.
- Observaciones.
- Productos y cantidades.
- Precios unitarios.
- Subtotal y total.
- Estado actual.
- Historial de cambios de estado.

El historial debe mostrar estado anterior, nuevo estado, fecha, administrador responsable y motivo cuando existan.

No exponer datos internos como idempotencyKey o requestHash.

## 9. Actualización de estados

Consumir PATCH `/api/admin/orders/:id/status`.

Permitir seleccionar un nuevo estado respetando las reglas que aplica el backend.

Estados:

- pending
- confirmed
- preparing
- on_the_way
- delivered
- cancelled

Reglas de interfaz:

- No permitir que un pedido de retiro pase a on_the_way.
- Solicitar motivo cuando el backend lo requiera.
- Limitar el motivo a 300 caracteres.
- Mostrar errores de validación y conflictos.
- Actualizar el detalle y listado después de una operación exitosa.
- Refrescar las estadísticas cuando corresponda.
- Evitar dobles envíos mientras una actualización esté en curso.

El backend sigue siendo la autoridad final para validar las transiciones.

## 10. Diseño y experiencia

- Mantener la identidad cálida y familiar de Pizza D' Jhon.
- Reutilizar colores, tipografía y recursos existentes cuando sea posible.
- Diseño responsive para escritorio, tablet y móvil.
- Navegación administrativa clara.
- Diferenciar visualmente los estados mediante etiquetas.
- Botones y formularios con estados de carga y mensajes comprensibles.
- Confirmación antes de acciones importantes como cancelar un pedido.
- Evitar interfaces innecesariamente complejas.

## 11. Organización del código

Mantener separados:

- Servicios API administrativos.
- Servicio de autenticación.
- Componentes de login.
- Componentes de protección de rutas.
- Dashboard.
- Listado y detalle de pedidos.
- Componentes reutilizables cuando aporten valor.

Seguir las convenciones existentes del repositorio y evitar dependencias innecesarias.

## 12. Restricciones técnicas

- No modificar archivos del backend.
- No modificar modelos ni servicios de MongoDB.
- No crear administradores.
- No ejecutar scripts de índices.
- No realizar migraciones ni escrituras en MongoDB.
- No modificar pedidos reales o de prueba.
- No modificar el stash existente.
- No alterar el carrito, checkout ni funcionamiento público existente.
- No introducir localhost:3000 directamente en nuevos servicios frontend.
- Respetar VITE_API_BASE_URL y las rutas relativas `/api`.
- No instalar React Router.
- No implementar la Etapa 6.
- No realizar commits ni push.

## 13. Pruebas y verificaciones

Ejecutar:

- Build de producción del frontend.
- Lint.
- Pruebas existentes que correspondan.
- Verificación de navegación entre rutas.
- Verificación de protección de rutas.
- Verificación de estados de carga, error y sesión expirada.
- Verificación de llamadas API y envío CSRF.

Si no existen credenciales reales, no crear administradores ni modificar la base de datos para probar.

Utilizar mocks o pruebas aisladas cuando sea necesario.

Comprobar que la web pública, menú, carrito y checkout continúan funcionando.

## 14. Informe final obligatorio

Entregar:

1. Auditoría inicial y hallazgos.
2. Archivos creados y modificados.
3. Funcionalidades implementadas.
4. Endpoints consumidos.
5. Pruebas ejecutadas y resultados exactos.
6. Verificaciones de compatibilidad pública.
7. Limitaciones pendientes.
8. Confirmación de que no se modificó backend, MongoDB, índices, stash ni pedidos.
9. Confirmación de que no se hicieron commits ni push.

Detenerse al terminar esta etapa y esperar revisión y autorización expresa para continuar.