const express = require('express');
const router = express.Router();
const produtoController = require('../controllers/produtoController');

// Chama a função do controller em vez de ter a função dentro da rota
router.get('/', produtoController.listarProdutos);

module.exports = router;