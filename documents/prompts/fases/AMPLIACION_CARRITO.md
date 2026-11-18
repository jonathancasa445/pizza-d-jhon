# Preparación del catálogo de productos simples — Pizza D' Jhon

Vamos a incorporar Alitas, Acompañantes y Bebidas al catálogo existente.

## 1. Catálogo solicitado

### Alitas
- BBQ: 6 unidades, $4.00.
- Honey Mustard: 6 unidades, $4.00.

Categoría: `alitas`.

### Acompañantes
- Pan de ajo supremo (6 unidades): $2.50.
- Cinnamon Stick: $2.50.
- Bread Stick: $2.50.
- Papas supremas: $3.00.
- Nuggets con salsa BBQ (6 unidades): $2.00.
- Nachos con salsa de queso: $2.00.

Categoría: `acompanantes`.

### Bebidas
Crear dos productos:

1. Línea Coca-Cola (1.35 litros):
   - Coca-Cola
   - Sprite
   - Fiora Vanti
   - Fanta
   - Precio: $1.50 para todos los sabores.

2. Línea Pepsi (1 litro):
   - Pepsi
   - Seven
   - Gallito
   - Tropical
   - Precio: $1.00 para todos los sabores.

Categoría: `bebidas`.

Cada línea de bebidas debe ser un solo producto con selector de sabor, no cuatro productos independientes. Cada línea tiene una imagen propia.

## 2. Objetivo de este trabajo

Realizar una auditoría breve y preparar los registros necesarios para incorporar estos productos al catálogo actual.

## 3. Revisiones obligatorias

1. Revisar el modelo Product y las reglas actuales de validación.
2. Revisar cómo se registran actualmente los productos y cómo funciona el script de seed del catálogo.
3. Inspeccionar los archivos JPG existentes en `frontend/public/images/menu/`.
4. Identificar qué imagen corresponde a cada producto.
5. Comprobar que los productos simples y sus variantes son compatibles con el frontend, carrito, checkout y backend.
6. Revisar cómo se representan las variantes en los productos actuales.

## 4. Reglas de seguridad

- NO insertar documentos en MongoDB todavía.
- NO ejecutar scripts de seed con escritura.
- NO modificar ni eliminar productos existentes.
- NO modificar las pizzas ni sus variantes.
- NO modificar secciones, índices, pedidos ni administradores.
- NO sobrescribir imágenes.
- NO cambiar funcionalidades que ya están operativas.
- No inventar nombres de archivos de imágenes: utilizar únicamente rutas verificadas.
- Los precios deben almacenarse en centavos enteros:
  - $4.00 = 400.
  - $2.50 = 250.
  - $3.00 = 300.
  - $2.00 = 200.
  - $1.50 = 150.
  - $1.00 = 100.

## 5. Estructura esperada

Utilizar el esquema actual de productos simples:

- `kind: 'simple'`
- `schemaVersion: 1`
- `available: true`
- `legacy: false`
- `categoryKey` correspondiente.
- Una o varias variantes según corresponda.
- Cada variante debe tener su precio en centavos y estar disponible.
- Utilizar claves únicas y válidas para productos y variantes.

Para las bebidas, representar los sabores como variantes seleccionables del mismo producto, manteniendo el mismo precio dentro de cada línea.

Para los demás productos, utilizar una variante por producto cuando el modelo actual lo requiera.

## 6. Resultado solicitado

Entregar un informe con:

1. Tabla de productos y variantes preparados.
2. Ruta exacta de la imagen identificada para cada producto.
3. Claves de producto y variantes propuestas.
4. Precios en centavos.
5. Confirmación de compatibilidad con el catálogo actual.
6. Archivos que sería necesario crear o modificar para registrar los productos.
7. Método seguro para insertar únicamente estos nuevos productos sin modificar documentos existentes.
8. Riesgos o incompatibilidades detectados.

**Detente al terminar el informe. No implementes ni insertes nada todavía.**