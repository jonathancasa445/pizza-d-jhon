El plan técnico de la Fase 5 está aprobado conceptualmente. Antes de autorizar la implementación, quiero que incorpores los siguientes ajustes y cierres las decisiones pendientes.

### 1. Resolución de decisiones

- D1: Confirmado. Implementar autenticación administrativa, sin implementar autenticación de clientes.
- D2: `delivered` y `cancelled` serán estados terminales a efectos de auditoría, pero podrán corregirse retrospectivamente.
- D3: Incluir el registro inicial del historial con `changedBy: 'system'`.
- D4: Utilizar `username` como identificador del administrador.
- D5: Utilizar router-lite propio, sin React Router.
- D6: No añadir frameworks de pruebas frontend. Utilizar build, lint y pruebas manuales.
- D7: Paginación predeterminada de 20 pedidos, máximo 100 y orden descendente por fecha.
- D8: Rate limiting en memoria, documentando que se asume una sola instancia de Render.
- D9: Los índices nuevos requieren dry-run y autorización expresa antes de ejecutar cualquier `--apply`.

### 2. Ajustes obligatorios

**Seguridad de cookies**

Evalúa la compatibilidad real de las cookies HttpOnly entre Netlify y Render. No asumas que SameSite=None y CORS credentials garantizan su funcionamiento.

Compara:
- Proxy de API mediante Netlify.
- Dominios personalizados bajo el mismo dominio principal.

Recomienda la alternativa más sencilla y segura para nuestro despliegue.

**Historial de pedidos**

- Debe ser acumulativo e inmutable como registro histórico.
- Debe admitir pedidos antiguos que no tengan historial.
- Las modificaciones del estado y su historial deben guardarse atómicamente.
- El registro inicial debe generarse al crear el pedido.
- No permitir modificar productos, cantidades originales, precios, importes, idempotencyKey ni requestHash.

**Reglas para los cambios de estado**

- Permitir correcciones retrospectivas.
- Exigir motivo al retroceder en el flujo.
- Exigir motivo al salir de delivered o cancelled.
- Exigir motivo al cancelar un pedido.
- Impedir on_the_way para pedidos pickup.
- Definir claramente cómo se validan los cambios sin imponer transiciones irreversibles.

**Estadísticas**

Separar:
- Total de pedidos registrados.
- Conteos individuales por estado.
- Pedidos aceptados por la pizzería (confirmed, preparing, on_the_way y delivered).

No contabilizar pending ni cancelled como pedidos aceptados.

**Protección de rutas**

Separar correctamente las rutas públicas de autenticación (login, logout, csrf y consulta de sesión) de las rutas administrativas protegidas.

No aplicar requireAuth globalmente de manera que bloquee el propio inicio de sesión.

### 3. Restricciones de implementación

- No romper el funcionamiento público ni el registro de pedidos de la Fase 4.
- No modificar datos ni índices de MongoDB.
- No ejecutar scripts de creación o sincronización con `--apply`.
- No realizar commits.
- No añadir dependencias innecesarias.
- Conservar el stash y los cambios existentes.

### 4. Entregable final

Actualiza el plan técnico definitivo incorporando estas decisiones.

Identifica cualquier incompatibilidad técnica que todavía exista y explica cómo resolverla.

Organiza las etapas para que podamos implementar y verificar cada una antes de avanzar a la siguiente.

Esta solicitud sigue siendo exclusivamente de planificación. No modifiques archivos de implementación ni ejecutes operaciones.

Espera mi autorización para comenzar el desarrollo.