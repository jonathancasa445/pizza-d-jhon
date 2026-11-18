const express = require('express');
const { postOrder } = require('../controllers/orderController');

const router = express.Router();

// Registro de pedidos. Los precios se calculan siempre en el backend.
router.post('/', postOrder);

module.exports = router;
