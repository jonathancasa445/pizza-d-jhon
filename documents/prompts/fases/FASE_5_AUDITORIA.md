# FASE 5 — AUDITORÍA PREVIA DEL PANEL ADMINISTRATIVO

Vamos a preparar el panel administrativo de Pizza D' Jhon.

## Objetivo

Revisar el estado actual del proyecto y determinar cómo implementar un panel privado que permita:

1. Iniciar sesión como administrador.
2. Consultar los pedidos registrados en MongoDB.
3. Consultar el detalle de cada pedido.
4. Cambiar el estado de los pedidos.
5. Consultar estadísticas básicas: total de pedidos y cantidades por estado.

## Instrucciones

Esta es una auditoría exclusivamente de lectura.

- No modifiques archivos.
- No crees archivos.
- No ejecutes migraciones ni scripts que escriban en la base de datos.
- No cambies índices ni documentos de MongoDB.
- No hagas commits ni push.
- Conserva todos los cambios existentes.

## Revisiones necesarias

1. Examina el modelo `Order`, el servicio, controlador y rutas de pedidos.
2. Identifica los estados actualmente permitidos y las validaciones existentes.
3. Revisa si ya existe autenticación administrativa, middleware de autorización, modelo de administrador o mecanismo de sesión/token.
4. Comprueba cómo se creó o se pretende crear la cuenta inicial de administrador.
5. Examina la estructura actual del frontend y determina cómo incorporar una sección privada sin alterar el funcionamiento de la página pública.
6. Revisa las dependencias y scripts disponibles.

## Resultado esperado

Entrega un informe breve que contenga:

- Qué funcionalidades ya existen y pueden reutilizarse.
- Qué falta implementar.
- Qué archivos sería necesario modificar.
- Qué archivos nuevos serían necesarios.
- Cómo se protegerán los endpoints administrativos.
- Cómo se validarán los cambios de estado.
- Qué pruebas serán necesarias.

No implementes nada todavía. Espera mi autorización.