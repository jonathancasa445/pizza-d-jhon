# FASE 5 — ETAPA 3: Gestión de pedidos y lógica administrativa

Implementa exclusivamente la **Etapa 3 de la Fase 5** de Pizza D' Jhon.

## 1. Contexto obligatorio

El proyecto utiliza:
- Backend: Node.js, Express 5 y Mongoose 9.
- Base de datos: MongoDB Atlas.
- Pruebas backend: `node:test`.

Estado actual:
- Etapa 0 completada y commit realizado.
- Etapa 1 completada y commit realizado.
- Etapa 2 completada y commit realizado.
- HEAD conocido al terminar la Etapa 2: `108a7b3`.
- La autenticación administrativa ya está implementada.
- El modelo Order y el registro público de pedidos pertenecen a la Fase 4 y deben conservar su funcionamiento.

Antes de modificar archivos, revisa:
- `documents/prompts/fases/FASE_5_ET3.md`
- La documentación general de la Fase 5.
- El modelo Order actual.
- Los servicios y controladores de pedidos existentes.
- Las pruebas actuales relacionadas con pedidos.
- Las constantes y reglas de estados ya definidas.

Respeta las decisiones técnicas y funcionales existentes. Si encuentras alguna contradicción entre la documentación y el código, detente y repórtala antes de tomar una decisión que pueda afectar datos o comportamiento.

## 2. Alcance exclusivo de esta etapa

Implementar la lógica de negocio y las estructuras necesarias para la gestión administrativa de pedidos.

Incluye:

1. Extensión del modelo Order.
2. Gestión de estados y validación de transiciones.
3. Registro acumulativo del historial.
4. Servicios para listar pedidos.
5. Servicios para consultar el detalle de un pedido.
6. Servicios para obtener estadísticas administrativas.
7. Serialización de datos para las futuras respuestas administrativas.
8. Pruebas automatizadas.

No implementes todavía los endpoints administrativos ni el frontend.

## 3. Estados de los pedidos

Utiliza exclusivamente estos estados:

- `pending`
- `confirmed`
- `preparing`
- `on_the_way`
- `delivered`
- `cancelled`

Flujo normal:

`pending → confirmed → preparing → on_the_way → delivered`

Los pedidos de modalidad `pickup` no deben pasar por `on_the_way`.

El estado `cancelled` queda fuera del flujo normal.

Reglas:

- `delivered` y `cancelled` son estados terminales para el flujo normal.
- Se permiten correcciones retrospectivas, pero deben quedar justificadas mediante un motivo.
- Se requiere motivo obligatorio al retroceder en el flujo.
- Se requiere motivo obligatorio al salir de `delivered` o `cancelled`.
- Se requiere motivo obligatorio al cancelar un pedido.
- El motivo tendrá un máximo de 300 caracteres.
- Valida que el nuevo estado exista y que la transición sea permitida.
- No permitas cambios que incumplan las reglas de modalidad.

Conserva las reglas ya acordadas en la documentación. No inventes nuevos estados ni reglas funcionales.

## 4. Historial de estados

Cada cambio debe agregar una entrada acumulativa con esta estructura:

- `previousStatus`
- `newStatus`
- `changedBy`
- `changedAt`
- `reason`

El primer historial de un pedido nuevo debe registrar:

- `previousStatus: null`
- `newStatus: 'pending'`
- `changedBy: 'system'`
- `changedAt`: fecha de creación del registro.
- `reason: ''`

El historial nunca debe sobrescribirse ni perder entradas anteriores.

Los pedidos antiguos que no tengan `statusHistory` deben seguir funcionando. No realices migraciones masivas ni modifiques documentos existentes.

Cuando se actualice el estado, utiliza una operación atómica que combine `$set` y `$push`, evitando perder entradas del historial ante actualizaciones concurrentes.

El identificador del administrador debe obtenerse del contexto autenticado que se utilizará posteriormente. No inventes identificadores ni permitas que el cliente determine libremente quién realizó el cambio.

## 5. Inmutabilidad de los datos del pedido

Los siguientes datos no deben modificarse mediante la gestión administrativa de estados:

- Productos e identificadores originales.
- Cantidades originales.
- Precios congelados.
- Subtotales y totales.
- Moneda.
- `idempotencyKey`.
- `requestHash`.

La Etapa 3 no debe alterar el mecanismo de registro público de pedidos ni su idempotencia.

## 6. Servicios de consulta

Implementa la lógica necesaria para:

### Listado de pedidos
- Paginación.
- 20 resultados por defecto.
- Máximo 100 resultados por página.
- Orden descendente por `createdAt`.
- Filtro opcional por estado.
- Validación de parámetros.

### Detalle de pedido
- Consultar un pedido por su identificador.
- Devolver sus datos y el historial completo.
- Mantener compatibilidad con pedidos antiguos sin historial.

### Estadísticas

Calcular:

- Total de pedidos.
- Cantidad por cada estado.
- Pedidos aceptados: suma de `confirmed`, `preparing`, `on_the_way` y `delivered`.

No contabilices `pending` ni `cancelled` como pedidos aceptados.

No llames a los pedidos aceptados «ventas». Los pedidos registrados no equivalen necesariamente a ventas completadas.

## 7. Compatibilidad y serialización

Prepara una serialización consistente para los datos administrativos.

No expongas:
- Hashes de contraseñas.
- Sales de contraseñas.
- Parámetros internos de autenticación.
- JWT.
- Cookies.
- Secretos o variables de entorno.

No rompas las respuestas ni los endpoints públicos existentes.

Los pedidos antiguos deben poder consultarse aunque no tengan `statusHistory`.

## 8. Índices y base de datos

No ejecutes cambios sobre índices de MongoDB.

Si consideras necesario crear índices adicionales:
- Documenta cuáles serían.
- Explica qué consulta optimizarían.
- Incluye una propuesta de dry-run si corresponde.
- Espera autorización expresa antes de cualquier aplicación.

No realices migraciones ni modificaciones masivas de documentos.

No ejecutes comandos que creen, actualicen o eliminen administradores.

## 9. Pruebas obligatorias

Agrega pruebas para:

- Estados válidos e inválidos.
- Transiciones permitidas y rechazadas.
- Restricción de `on_the_way` para pedidos `pickup`.
- Motivos obligatorios.
- Límite de 300 caracteres.
- Registro correcto del historial.
- Conservación de entradas anteriores.
- Compatibilidad con pedidos antiguos sin historial.
- Inmutabilidad de los datos originales.
- Paginación y filtros.
- Consulta del detalle.
- Cálculo de estadísticas.

Utiliza mocks o bases aisladas para las pruebas que lo necesiten. No modifiques pedidos reales de MongoDB Atlas.

Ejecuta todas las pruebas backend y verifica que las pruebas preexistentes de la Fase 4 continúen funcionando.

## 10. Restricciones absolutas

- No implementar endpoints administrativos: corresponden a la Etapa 4.
- No implementar frontend: corresponde a la Etapa 5.
- No modificar la autenticación de la Etapa 2 salvo que sea estrictamente necesario para integrar la lógica prevista; si lo fuera, informa primero.
- No crear administradores.
- No ejecutar `admin:create`.
- No modificar ni eliminar pedidos reales.
- No modificar índices de MongoDB.
- No tocar el stash existente.
- No modificar archivos ajenos al alcance.
- No realizar commits ni push.
- No avanzar a la Etapa 4.

## 11. Informe final obligatorio

Al terminar, entrega un informe que incluya:

1. Archivos creados.
2. Archivos modificados.
3. Servicios y funciones implementados.
4. Reglas de estados implementadas.
5. Tratamiento de pedidos antiguos.
6. Pruebas ejecutadas y resultados exactos.
7. Confirmación de que la Fase 4 continúa funcionando.
8. Confirmación de que no se modificaron documentos ni índices reales de MongoDB.
9. Confirmación de que no se crearon administradores.
10. Riesgos, limitaciones o decisiones pendientes.
11. Estado de Git, incluyendo confirmación de que no realizaste commits ni alteraste el stash.

Implementa únicamente esta etapa. No continúes sin autorización expresa.