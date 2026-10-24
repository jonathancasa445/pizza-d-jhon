require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./database');
const Product = require('./models/Product');

const products = [
  {
    name: 'Pizza mediana-Amante a la carne',
    description: 'Una excelente opción depizza para compartir entre un pequeño grupo.',
    ingredients: ['Queso', 'jamón', 'Pepperoni', 'Tocinos', 'Pata de tomate'],
    price: 5,
    imageUrl: '',
    category: 'Pizzas',
    available: true,
  },
  {
    name: 'Pizza mediana-Suprema',
    description: 'Una combinación especial de ingredientes.',
    ingredients: ['Queso', 'Tomate', 'Jamón', 'Champiñones', 'Pimientos', 'cebolla', 'pepperoni', 'salchicas'],
    price: 5,
    imageUrl: '',
    category: 'Pizzas',
    available: true,
  },
  {
    name: 'Pizza familiar',
    description: 'Una pizza grande para disfrutar en familia.',
    ingredients: ['Queso', 'Tomate', 'Jamón', 'Champiñones'],
    price: 10,
    imageUrl: '',
    category: 'Pizzas',
    available: true,
  },
];

async function seedProducts() {
  try {
    await connectDB();

    const existingProducts = await Product.countDocuments();

    if (existingProducts > 0) {
      console.log(
        'Ya existen productos. No se añadieron productos de prueba.'
      );
      return;
    }

    await Product.insertMany(products);

    console.log('Productos de prueba registrados correctamente.');
  } catch (error) {
    console.error('Error al registrar productos:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

seedProducts();