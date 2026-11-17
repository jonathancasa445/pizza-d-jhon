const express = require('express');
const Product = require('../models/Product');
const { getProduct } = require('../controllers/menuController');

const router = express.Router();

// Endpoint legado que sigue consumiendo el frontend actual.
// Devuelve únicamente los documentos antiguos para que el catálogo actual
// continúe mostrando los tres productos durante la Fase 2, incluso si más
// adelante se cargan productos nuevos con schemaVersion: 1.
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({
      available: true,
      schemaVersion: { $ne: 1 },
    }).select(
      'name description ingredients price imageUrl category available'
    );

    res.status(200).json(products);
  } catch (error) {
    console.error('Error al consultar productos:', error.message);

    res.status(500).json({
      message: 'Error al obtener los productos.',
    });
  }
});

// Detalle de un producto del catálogo nuevo.
router.get('/:key', getProduct);

module.exports = router;
