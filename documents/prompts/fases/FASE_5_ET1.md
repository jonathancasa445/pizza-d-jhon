# FASE 5 — ETAPA 1: MODELO ADMIN Y CLI

Lee primero el plan técnico aprobado de la Fase 5 y la auditoría correspondiente. Implementa exclusivamente la Etapa 1.

## Objetivo

Crear el modelo de administrador y un mecanismo seguro mediante CLI para registrar al primer administrador.

## Requisitos

1. Crear el modelo `Admin` con:
   - `username` como identificador único.
   - Contraseña almacenada exclusivamente como salt y hash.
   - Hashing mediante `scrypt` nativo de Node.js.
   - Timestamps.
   - Validaciones y normalización apropiadas del nombre de usuario.

2. Implementar un script CLI para crear administradores:
   - No debe existir registro público.
   - Debe permitir crear el primer administrador.
   - Debe comprobar que el nombre de usuario no esté duplicado.
   - Debe solicitar las credenciales de forma segura.
   - Nunca debe imprimir ni registrar contraseñas o hashes.
   - No debe incluir credenciales predeterminadas.

3. Añadir pruebas automatizadas para:
   - Hash y verificación de contraseñas.
   - Contraseñas incorrectas.
   - Usuarios duplicados.
   - Validaciones del modelo.
   - Comportamiento seguro del CLI, en lo que pueda probarse sin crear administradores reales.

## Restricciones obligatorias

- No ejecutar el CLI ni crear ningún administrador todavía.
- No modificar documentos de MongoDB.
- No modificar ni aplicar índices.
- No avanzar a la Etapa 2.
- No modificar endpoints de autenticación ni crear sesiones.
- No realizar commits ni push.
- Mantener intactos `stash@{0}` (hash `8801c79`) y HEAD `9f5f2b0`.
- No alterar el pedido histórico de prueba ni utilizarlo para pruebas.
- Mantener intacto el funcionamiento existente de la Fase 4.

## Verificaciones

Ejecuta las pruebas pertinentes del backend y comprueba que el proyecto siga compilando correctamente.

Al terminar, entrega un informe con:
1. Archivos creados y modificados.
2. Diseño del modelo Admin.
3. Funcionamiento del CLI.
4. Pruebas ejecutadas y resultados.
5. Confirmación de que no se creó ningún administrador.
6. Confirmación de que MongoDB, índices, stash y commits permanecen intactos.
7. Cualquier riesgo o decisión pendiente.

**Detente al completar la Etapa 1 y espera autorización antes de continuar.**