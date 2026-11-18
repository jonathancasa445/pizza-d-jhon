# RECUPERACIÓN CONTROLADA — FASE 4

Lee el informe de diagnóstico de la Fase 4 y realiza únicamente la recuperación de los cambios respaldados.

## Objetivo
Restaurar los 14 archivos de la Fase 4 desde `stash@{0}` sin perder el respaldo ni sobrescribir cambios independientes.

## Procedimiento

1. Confirma que el working tree y el índice siguen en el estado descrito en el diagnóstico.
2. Recupera los cambios usando `git stash apply 'stash@{0}'`. No utilices `pop`.
3. Si aparece un conflicto, detente y analiza las diferencias antes de resolverlo.
4. En `backend/src/server.js`, conserva ambas cosas:
   - Registro de `orderRoutes` en `/api/orders`.
   - CORS con los orígenes `localhost:5173` y `localhost:5177`.
5. Comprueba que los 14 archivos de Fase 4 estén recuperados y que no falte ningún archivo nuevo.
6. Comprueba `git status` y verifica que el stash original siga existiendo.

## Restricciones

- No ejecutes seeds ni crees pedidos reales.
- No modifiques documentos ni índices de MongoDB.
- No ejecutes `--apply` en el script de índices.
- No elimines el stash.
- No hagas commits todavía.
- No implementes funcionalidades nuevas ni repitas trabajo ya realizado.

## Verificación

Una vez recuperados los archivos:
- Ejecuta las 41 pruebas backend.
- Ejecuta el build y lint del frontend, si están disponibles.
- Identifica los procesos antiguos que puedan interferir y evita dejar servidores duplicados.
- No repitas todavía la prueba real del endpoint.

## Informe final

Indica:
1. Resultado de la recuperación.
2. Estado del stash.
3. Estado de `server.js` y CORS.
4. Archivos recuperados.
5. Resultado de las pruebas.
6. Cualquier conflicto o problema encontrado.

Detente al entregar el informe.