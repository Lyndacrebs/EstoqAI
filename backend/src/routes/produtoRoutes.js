const express = require('express');
const router = express.Router();
const produtoController = require('../controllers/produtoController');

// Chama a função do controller em vez de ter a função dentro da rota
router.get('/', produtoController.listarProdutos);
router.get('/:id', produtoController.buscarProdutoPorId);
router.post('/', produtoController.criarProduto);
router.put('/:id', produtoController.atualizarProduto);
router.delete('/:id', produtoController.excluirProduto);

module.exports = router;