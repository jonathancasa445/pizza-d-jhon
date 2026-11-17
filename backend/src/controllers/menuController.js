const {
  getPublicMenu,
  getProductByKey,
  isValidProductKey,
} = require('../services/menuService');

async function getMenu(req, res) {
  try {
    const menu = await getPublicMenu();

    res.status(200).json(menu);
  } catch (error) {
    console.error('Error al consultar el menú:', error.message);

    res.status(500).json({
      message: 'Error al obtener el menú.',
    });
  }
}

async function getProduct(req, res) {
  const { key } = req.params;

  if (!isValidProductKey(key)) {
    return res.status(400).json({
      message: 'La clave del producto no es válida.',
    });
  }

  try {
    const result = await getProductByKey(key);

    if (!result) {
      return res.status(404).json({
        message: 'Producto no encontrado.',
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error al consultar el producto:', error.message);

    return res.status(500).json({
      message: 'Error al obtener el producto.',
    });
  }
}

module.exports = {
  getMenu,
  getProduct,
};
