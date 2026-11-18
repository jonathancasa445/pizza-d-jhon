He revisado el informe de la Etapa 0. El resultado general es satisfactorio, pero todavía necesitamos resolver algunos puntos antes de autorizar la Etapa 1.

Realiza únicamente las siguientes tareas:

### 1. Adaptar menuApi.js
- Revisa cómo quedó implementado ordersApi.js.
- Adapta menuApi.js para utilizar la misma estrategia de URL configurable.
- Las peticiones de menú deben funcionar mediante el proxy de Vite en desarrollo y el proxy de Netlify en producción.
- No alteres la lógica de consulta del catálogo.

### 2. Verificar el registro público de pedidos
Las solicitudes inválidas que devolvieron 400 no son suficientes para demostrar que el registro de pedidos continúa funcionando.

Prepara y ejecuta pruebas aisladas que comprueben:
- Registro válido de un pedido.
- Persistencia simulada mediante repositorio mock o base de datos de pruebas aislada.
- Funcionamiento de la idempotencia.
- Rechazo de solicitudes inválidas.

No insertes pedidos adicionales en la base de datos de producción.

### 3. Investigar el pedido preexistente
Durante la auditoría final apareció un pedido en la colección orders, aunque anteriormente se habían registrado cero pedidos.

Realiza únicamente una investigación de solo lectura para determinar si existe información que permita identificar su procedencia.

No muestres datos personales innecesarios en el informe.

No modifiques, elimines ni actualices ese pedido.

No ejecutes operaciones de escritura en MongoDB.

### 4. Verificación final
- Ejecuta nuevamente las pruebas backend.
- Ejecuta build y lint frontend.
- Comprueba las rutas del catálogo y los pedidos.
- Comprueba que menuApi.js utiliza correctamente la configuración de proxy.
- Confirma que el stash y HEAD permanecen intactos.

### Restricciones
No avances a la Etapa 1.
No crees el administrador.
No modifiques modelos ni índices de MongoDB.
No realices commits.
No alteres documentos existentes.

Al finalizar, entrega un informe breve con los cambios, pruebas, resultados y cualquier asunto pendiente.

Espera mi autorización antes de continuar.