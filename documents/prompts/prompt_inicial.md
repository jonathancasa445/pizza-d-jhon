Proyecto Pizza D' Jhon — Ampliación del catálogo y rediseño del menú
1. Contexto del proyecto
Estoy desarrollando una aplicación web para una pizzería familiar llamada Pizza D' Jhon.
El proyecto ya cuenta con una estructura funcional:
Frontend desarrollado con React y Vite.
Backend desarrollado con Node.js y Express.
Base de datos MongoDB Atlas utilizando Mongoose.
API para consultar productos.
Catálogo dinámico conectado al backend.
Carrito de compras con React useState.
Persistencia del carrito mediante localStorage.
Funcionalidades para añadir, aumentar, disminuir y eliminar productos.
Cálculo automático del importe total.
Opción para vaciar el carrito.
Actualmente existe una sola página principal y un catálogo temporal de tres pizzas de prueba.
IMPORTANTE: Antes de modificar cualquier archivo, inspecciona la estructura completa del proyecto y comprende cómo están conectados el frontend, el backend y MongoDB.
No reemplaces archivos completos sin necesidad, no elimines funcionalidades existentes y no introduzcas tecnologías innecesarias.
2. Objetivo de esta etapa
Rediseñar la organización del menú y preparar una estructura de productos que represente correctamente el funcionamiento comercial de la pizzería.
Queremos pasar de un catálogo de productos simples a un catálogo con diferentes presentaciones, recetas de pizza e ingredientes adicionales.
3. Lógica comercial actual
Las presentaciones disponibles son:
Pizza familiar: $10.00
Pizza mediana: $5.00
Pizza de borde: $12.00
Actualmente todos los sabores tienen el mismo precio dentro de una presentación.
Sin embargo, la estructura debe permitir que en el futuro cada tipo de pizza pueda tener un precio diferente.
Los sabores iniciales de ejemplo incluyen:
Jamón.
Pepperoni.
Hawaiana.
Amante a la carne.
Suprema
Continental
Mixta.(Escoger 2 sabores, y la pizza sería mitad, mitad)
Esta lista es inicial y debe poder ampliarse fácilmente.
Los ingredientes adicionales disponibles son:
Queso extra.
Jamón extra.
Pepperoni extra.
Piña.
Tocino.
Chorizo.
Mix de vegetales.
Champiñón.
Salami.
Cada ingrediente adicional debe tener su propio precio configurable.
Los precios de los ingredientes adicionales todavía no están definidos. No inventes precios ni los consideres gratuitos. Deja la configuración preparada para introducir sus precios reales.
4. Diseño y experiencia del menú
Queremos una página independiente para el menú.
La organización visual debe utilizar secciones desplegables tipo acordeón:
Sección 1: Pizzas familiares
Debe mostrar inicialmente una imagen representativa, el nombre de la presentación y su precio inicial de $10.00.
Al desplegarla, deben aparecer tarjetas individuales de las pizzas disponibles.
Sección 2: Pizzas medianas
Debe mostrar una imagen representativa, el nombre y el precio inicial de $5.00.
Al desplegarla, deben aparecer las tarjetas de las pizzas disponibles.
Sección 3: Pizzas de borde
Debe mostrar una imagen representativa, el nombre y el precio inicial de $12.00.
Al desplegarla, deben aparecer las tarjetas de las pizzas disponibles.
Tarjetas de pizzas
Cada tarjeta debe mostrar:
Fotografía.
Nombre de la pizza.
Descripción.
Precio correspondiente a la presentación.
Botón para personalizar o seleccionar.
Diseña una interfaz cálida, familiar, moderna y profesional, utilizando como referencia la identidad visual actual de Pizza D' Jhon.
Conserva una paleta de colores basada en tonos crema, rojo, negro, naranja y marrón.
El diseño debe ser responsive y funcionar correctamente en computadoras, tablets y teléfonos.
Ampliación: categorías y complementos del menú
El sistema de secciones desplegables tipo acordeón debe aplicarse a todo el menú, no solamente a las pizzas.
Categorías iniciales:
Pizzas familiares.
Pizzas medianas.
Pizzas de borde.
Alitas.
Acompañantes.
Bebidas.
Cada sección debe presentar una imagen representativa y, al desplegarse, mostrar tarjetas individuales de sus productos.
Cada tarjeta debe incluir fotografía, nombre, descripción, precio y acceso a la personalización cuando corresponda.
IMPORTANTE:
No todos los productos deben compartir las mismas opciones.
Las pizzas tendrán presentaciones, sabores e ingredientes adicionales.
Los complementos y bebidas podrán tener opciones diferentes según sus características, por ejemplo, tamaños, cantidades o variedades.
Diseña una estructura flexible que permita incorporar nuevas categorías y productos sin tener que modificar toda la aplicación.
No inventes productos, opciones ni precios que no hayan sido proporcionados.
Mantén el carrito preparado para recibir correctamente cualquier tipo de producto y su personalización.
5. Personalización de productos
Al seleccionar una pizza, el cliente debe poder:
Consultar el nombre y fotografía.
Consultar los ingredientes que incluye.
Verificar la presentación y el precio base.
Seleccionar ingredientes adicionales.
Ver cómo se actualiza el precio según los ingredientes elegidos.
Elegir la cantidad.
Añadir la selección al carrito.
Los ingredientes adicionales deben tener precios individuales configurables.
6. Arquitectura y modelo de datos
Inspecciona el modelo Product.js actual y propón una ampliación adecuada.
La estructura debe permitir:
Registrar nuevas pizzas.
Modificar nombres y descripciones.
Administrar fotografías.
Registrar ingredientes originales de cada receta.
Configurar las tres presentaciones y sus precios.
Configurar ingredientes adicionales y sus precios.
Activar o desactivar productos y opciones.
Modificar precios individualmente en el futuro.
Es importante que la estructura no obligue a crear un producto independiente por cada presentación o sabor.
Puedes proponer modelos adicionales si realmente aportan valor, pero mantén una arquitectura sencilla y fácil de mantener.
7. Adaptación del carrito
El carrito actual debe conservar sus funcionalidades.
Debe adaptarse para identificar correctamente cada selección mediante:
Pizza seleccionada.
Presentación.
Ingredientes adicionales.
Cantidad.
Dos pizzas de la misma receta deben poder aparecer como selecciones independientes si tienen diferentes presentaciones o ingredientes adicionales.
Los cálculos deben considerar el precio base de la presentación y los precios de los ingredientes adicionales.
La persistencia mediante localStorage debe seguir funcionando.
8. Navegación
Prepara una página independiente para el menú y una navegación clara entre:
Inicio.
Menú.
Carrito.
Contacto.
Puedes incorporar React Router si resulta adecuado para la estructura existente.
No elimines la página principal actual.
9. Reglas de trabajo
Trabaja por etapas:
Etapa A: Auditoría
Inspecciona los archivos existentes.
Identifica las dependencias.
Explica cómo está organizado el proyecto.
Identifica qué archivos necesitan modificaciones.
Propón el modelo de datos.
Presenta un plan de implementación.
No realices modificaciones durante esta primera etapa.
Etapa B: Estructura de datos
Después de recibir aprobación, implementa el nuevo modelo y las adaptaciones necesarias en el backend.
No elimines datos existentes sin explicar primero cómo se migrarán.
Etapa C: Menú
Implementa la página independiente y las secciones desplegables.
Etapa D: Personalización
Implementa la selección de presentaciones, recetas e ingredientes adicionales.
Etapa E: Carrito
Adapta el carrito existente y verifica que todas sus funcionalidades sigan operativas.
Etapa F: Pruebas
Comprueba los cálculos, persistencia, navegación y diseño responsive.
Después de cada etapa:
Explica los archivos modificados.
Indica qué cambios realizaste.
Explica cómo probarlos.
Informa de posibles errores o decisiones pendientes.
No avances a una etapa posterior sin haber terminado y comprobado la anterior.
10. Restricciones importantes
No elimines el backend ni la conexión actual con MongoDB.
No reemplaces el proyecto por una aplicación nueva.
No dupliques funcionalidades que ya existen.
No inventes precios.
No introduzcas datos comerciales definitivos que no hayan sido proporcionados.
No modifiques credenciales ni archivos .env.
No expongas información sensible.
No implementes todavía el checkout ni el registro definitivo de pedidos.
Mantén el código comprensible y adecuado para un desarrollador que está aprendiendo React y Node.js.
Primera tarea: realiza únicamente la auditoría del proyecto y presenta tu propuesta de implementación. Espera mi aprobación antes de modificar archivos.

