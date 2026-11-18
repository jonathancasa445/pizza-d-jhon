# FASE 5 — ETAPA 2: AUTENTICACIÓN Y SESIONES ADMINISTRATIVAS

Lee primero el plan técnico aprobado de la Fase 5, la auditoría inicial y los documentos existentes de la Etapa 2.

Implementa exclusivamente la Etapa 2.

## 1. Objetivo

Implementar un sistema de autenticación para administradores que permita iniciar sesión, mantener una sesión segura, verificar su estado y cerrarla.

Utiliza el modelo Admin y el servicio passwordService implementados en la Etapa 1.

## 2. Funcionalidades requeridas

### A. Inicio de sesión

Implementar el endpoint:

`POST /api/admin/auth/login`

Requisitos:
- Recibir username y password.
- Normalizar el username de acuerdo con el modelo Admin.
- Buscar administradores mediante el modelo existente.
- Recuperar explícitamente los campos de contraseña protegidos con `select: false`.
- Verificar la contraseña utilizando passwordService.
- Rechazar credenciales incorrectas sin revelar si el usuario existe.
- Rechazar administradores inactivos.
- Emitir un JWT únicamente después de autenticar correctamente.
- Establecer la cookie de sesión segura.
- Actualizar lastLoginAt cuando corresponda.
- Aplicar rate limiting conforme al plan aprobado.
- No devolver contraseñas, hashes, salts ni secretos en las respuestas.

### B. Sesión y JWT

Utilizar JWT mediante la dependencia ya instalada.

Requisitos:
- Firmar con JWT_SECRET.
- Respetar JWT_EXPIRES_IN.
- Incluir únicamente los datos necesarios en el payload, como el identificador del administrador.
- Verificar firma y expiración en cada solicitud protegida.
- Rechazar tokens inválidos, vencidos o malformados.
- No almacenar JWT en localStorage ni sessionStorage.

La cookie debe respetar las decisiones aprobadas:
- HttpOnly.
- Secure en producción.
- SameSite=Lax.
- Path=/.
- Sin Domain.
- Host-only.

Utilizar la configuración centralizada de seguridad existente.

### C. Verificación de sesión

Implementar:

`GET /api/admin/auth/me`

Debe:
- Comprobar la cookie de sesión.
- Verificar el JWT.
- Confirmar que el administrador todavía existe y está activo.
- Devolver únicamente información pública del administrador autenticado.
- Responder con un estado de no autenticado cuando la sesión no sea válida.

### D. Protección CSRF

Implementar:

`GET /api/admin/auth/csrf`

Debe proporcionar el mecanismo double-submit CSRF definido en la Etapa 0.

Aplicar la protección a las operaciones sensibles que correspondan, especialmente login y logout, siguiendo el diseño aprobado.

No aplicar requireAuth globalmente a las rutas públicas de autenticación.

### E. Cierre de sesión

Implementar:

`POST /api/admin/auth/logout`

Debe:
- Aplicar la protección CSRF.
- Invalidar la cookie de sesión mediante su eliminación con los mismos atributos relevantes.
- Responder correctamente incluso si la sesión ya no es válida, siempre respetando CSRF.
- No revelar información sensible.

### F. Middleware

Implementar o completar el middleware de autenticación administrativa que:
- Extraiga el JWT desde la cookie.
- Verifique firma y expiración.
- Compruebe que el administrador existe y está activo.
- Ponga la identidad autenticada en el contexto de la solicitud.
- Rechace solicitudes no autenticadas.
- No confíe en identificadores enviados por el cliente.

## 3. Pruebas automatizadas

Agregar pruebas con `node:test`, utilizando mocks o mecanismos aislados cuando corresponda.

Cubrir como mínimo:

- Login correcto.
- Contraseña incorrecta.
- Usuario inexistente.
- Administrador inactivo.
- Campos sensibles recuperados correctamente.
- Cookie con atributos correctos en desarrollo y producción.
- JWT válido.
- JWT vencido.
- JWT inválido o manipulado.
- Administrador eliminado o desactivado después de emitir el token.
- Endpoint `/me` autenticado y no autenticado.
- Obtención y validación CSRF.
- Logout y eliminación de cookie.
- Rate limiting.
- Ausencia de contraseñas, hashes, salts y JWT en respuestas o logs.

No utilizar administradores reales ni crear documentos en MongoDB para estas pruebas.

## 4. Restricciones obligatorias

- Implementar exclusivamente la Etapa 2.
- No ejecutar `admin:create`.
- No crear administradores reales.
- No modificar el modelo Admin ni el servicio passwordService salvo que exista un defecto demostrado que impida la implementación; si lo hay, documentarlo y detenerse para autorización.
- No modificar modelos, servicios, endpoints ni estados de pedidos de la Fase 4.
- No avanzar a la Etapa 3.
- No modificar índices ni documentos de MongoDB.
- No ejecutar operaciones destructivas.
- No modificar el pedido histórico de prueba.
- No realizar commits ni push.
- No alterar ni eliminar el stash.
- No modificar configuraciones de despliegue con dominios inventados.
- No introducir dependencias innecesarias.

## 5. Compatibilidad

Mantener:
- Express y la estructura actual del backend.
- Cookie-parser y JWT ya instalados.
- Middleware CSRF, rate limit y cabeceras de seguridad de la Etapa 0.
- Los orígenes locales ya configurados.
- El funcionamiento público del menú y del registro de pedidos.
- La estrategia de proxy de Vite y Netlify.

No introducir React Router ni implementar todavía la interfaz del panel administrativo.

## 6. Verificaciones

Al terminar:

1. Ejecutar todas las pruebas del backend.
2. Ejecutar `node --check` en los archivos nuevos o modificados.
3. Comprobar que el frontend siga compilando y pasando lint.
4. Verificar que los endpoints públicos existentes sigan funcionando.
5. Confirmar que no se creó ningún administrador.
6. Confirmar que MongoDB e índices permanecen intactos.
7. Confirmar que no se realizaron commits ni push.

## 7. Informe final

Entregar:
- Archivos creados y modificados.
- Endpoints implementados.
- Funcionamiento de autenticación y sesiones.
- Atributos de cookies.
- Protección CSRF y rate limiting.
- Pruebas ejecutadas y resultados.
- Variables de entorno requeridas.
- Riesgos o decisiones pendientes.
- Confirmación de cumplimiento de todas las restricciones.

**Detente al completar la Etapa 2 y espera autorización expresa antes de comenzar la Etapa 3.**