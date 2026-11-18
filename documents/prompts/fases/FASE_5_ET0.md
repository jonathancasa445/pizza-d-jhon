Aprobado el plan técnico definitivo de la Fase 5.

Autorizo comenzar la implementación en modo Build, pero únicamente con la Etapa 0: Configuración, CORS y seguridad.

### Objetivo

Preparar la infraestructura necesaria para las siguientes etapas sin modificar todavía el sistema de pedidos ni implementar funcionalidades administrativas.

### Trabajo autorizado

1. Configuración de variables de entorno y seguridad.
2. Sustitución del CORS fijo por CLIENT_ORIGINS.
3. Configuración de cookies según el entorno.
4. Incorporación de cookie-parser y jsonwebtoken.
5. Implementación de los middlewares de seguridad previstos para esta etapa.
6. Configuración del proxy de API de Netlify.
7. Adaptación de ordersApi.js para utilizar rutas configurables.
8. Configuración del proxy de desarrollo de Vite hacia localhost:3000 si se utilizan rutas relativas.
9. Actualización de .env.example y documentación correspondiente.

### Consideraciones importantes

- Conserva los orígenes locales 5173 y 5177.
- No rompas el funcionamiento actual de POST /api/orders.
- El proxy de producción debe utilizar la URL real del backend Render, si está documentada en el proyecto. No inventes dominios ni credenciales.
- Configura las cookies de producción como HttpOnly, Secure, SameSite=Lax y Path=/, sin Domain, utilizando el proxy de Netlify.
- En desarrollo, permite el funcionamiento mediante localhost sin cookies Secure.
- Mantén la protección CSRF preparada para las siguientes etapas.
- Considera protección contra solicitudes externas en login y logout cuando implementemos las rutas de autenticación.
- No introduzcas dependencias adicionales innecesarias.

### Límites de autorización

NO implementar todavía:
- Modelo Admin.
- Creación de administradores.
- Login o logout.
- Endpoints administrativos.
- Modificaciones del modelo Order.
- Nuevos estados o historial de pedidos.
- Modificaciones de índices de MongoDB.

NO ejecutar scripts de base de datos.
NO ejecutar operaciones de escritura en MongoDB.
NO realizar commits.
NO modificar ni eliminar el stash existente.

### Verificaciones obligatorias

Al terminar:

1. Ejecuta las pruebas backend existentes.
2. Comprueba que POST /api/orders continúa funcionando.
3. Verifica CORS para los orígenes locales.
4. Comprueba la configuración de cookies por entorno.
5. Ejecuta build y lint del frontend.
6. Comprueba que las peticiones del catálogo y pedidos siguen funcionando.
7. Informa cualquier prueba que no pueda ejecutarse y explica por qué.

### Entregable

Presenta un informe final que incluya:

- Archivos modificados y nuevos.
- Dependencias añadidas.
- Cambios realizados.
- Pruebas ejecutadas y resultados.
- Problemas encontrados.
- Variables de entorno que tendremos que configurar posteriormente en Render y Netlify.
- Confirmación de que MongoDB, los índices y el stash permanecen intactos.

**IMPORTANTE:** No avances a la Etapa 1 automáticamente. Detente al terminar la Etapa 0 y espera mi revisión y autorización.