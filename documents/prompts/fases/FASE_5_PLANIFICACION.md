Vamos a comenzar la planificación técnica definitiva de la Fase 5 (Panel administrativo).

Ya realizaste una auditoría de solo lectura y documentaste los resultados en:

`documents/prompts/fases/FASE_5_AUDITORIA.md`

Quiero que utilices esa auditoría y las decisiones que hemos tomado durante esta misma sesión para preparar el plan de implementación.

### Decisiones funcionales ya tomadas

1. El panel será privado y exclusivo para administradores autenticados.
2. Tendrá acceso mediante la ruta `/admin`, sin afectar la navegación ni el funcionamiento de la página pública.
3. Permitirá:
   - Consultar el listado de pedidos.
   - Filtrar y paginar pedidos.
   - Consultar los detalles de cada pedido.
   - Actualizar el estado de los pedidos.
   - Consultar estadísticas y cantidades agrupadas por estado.
4. Utilizaremos los seis estados:
   - `pending`
   - `confirmed`
   - `preparing`
   - `on_the_way`
   - `delivered`
   - `cancelled`
5. La modalidad de retiro no necesita pasar por `on_the_way`.
6. Elegimos la opción B para la gestión de estados: permitir correcciones administrativas, incluso retrospectivas, sin imponer transiciones terminales irreversibles.
7. Cada modificación deberá registrarse en un historial acumulativo con:
   - `previousStatus`
   - `newStatus`
   - `changedBy`
   - `changedAt`
   - `reason`
8. El motivo será obligatorio cuando se corrija o revierta un estado terminal.
9. Los precios, productos, cantidades originales, importes e identificadores de idempotencia del pedido deben permanecer inmutables.
10. No implementaremos todavía autenticación ni registro de clientes.

### Instrucciones para la planificación

- No vuelvas a realizar una auditoría general del proyecto si la información existente es suficiente.
- Aprovecha la arquitectura, servicios, modelos y pruebas que ya existen.
- Evita introducir tecnologías o dependencias innecesarias.
- Analiza cómo implementar la autenticación administrativa, la protección CSRF y las sesiones de forma segura y compatible con nuestro despliegue Netlify + Render.
- Evalúa el mecanismo de creación inicial del administrador mediante CLI.
- Determina cómo ampliar el modelo Order y sus servicios sin comprometer el registro de pedidos de la Fase 4.
- Define los endpoints, validaciones, controladores, servicios y componentes frontend necesarios.
- Establece una estrategia de pruebas automatizadas.
- Identifica cualquier modificación de esquema o índice de MongoDB que requiera autorización y dry-run.
- Aprovecha las dependencias existentes antes de proponer otras nuevas.

### Entregable

Prepara un plan técnico organizado por etapas de implementación, indicando:

1. Objetivo de cada etapa.
2. Archivos existentes que se modificarán.
3. Archivos nuevos que se crearán.
4. Dependencias necesarias y justificación.
5. Pruebas que verificarán cada etapa.
6. Riesgos técnicos y medidas para evitarlos.
7. Decisiones técnicas que todavía necesitan mi aprobación.

IMPORTANTE:

Esta es únicamente una solicitud de planificación. No modifiques archivos, no ejecutes scripts, no realices operaciones en MongoDB y no hagas commits.

Conserva intactos el stash existente y los cambios actuales del repositorio.

Espera mi aprobación antes de comenzar la implementación.