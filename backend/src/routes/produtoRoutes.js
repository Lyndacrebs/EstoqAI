const express = require('express');
const router = express.Router();
const produtoController = require('../controllers/produtoController');
const { autenticarToken, autorizarPerfis } = require('../middlewares/authMiddleware');

// 1. Exige Token JWT válido em todas as rotas abaixo
router.use(autenticarToken);

// 2. Administrador, Operador e Visualizador podem CONSULTAR
router.get('/', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), produtoController.listarProdutos);
router.get('/:id', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), produtoController.buscarProdutoPorId);

// 3. Apenas Administrador e Operador podem CRIAR, ATUALIZAR ou EXCLUIR
router.post('/', autorizarPerfis('Administrador', 'Operador'), produtoController.criarProduto);
router.put('/:id', autorizarPerfis('Administrador', 'Operador'), produtoController.atualizarProduto);
router.delete('/:id', autorizarPerfis('Administrador', 'Operador'), produtoController.excluirProduto);

module.exports = router;