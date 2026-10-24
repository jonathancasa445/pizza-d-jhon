const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

// Obtener todos los productos disponibles.
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ available: true });

    res.status(200).json(products);
  } catch (error) {
    console.error('Error al consultar productos:', error.message);

    res.status(500).json({
      message: 'Error al obtener los productos.',
    });
  }
});

module.exports = router;