const express = require('express');
const { getMenu } = require('../controllers/menuController');

const router = express.Router();

// Catálogo público nuevo. No modifica ni reemplaza /api/products.
router.get('/', getMenu);

module.exports = router;
