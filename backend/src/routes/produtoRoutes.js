const express = require('express');
const router = express.Router();
const produtoController = require('../controllers/produtoController');
const { autenticarToken, autorizarPerfis } = require('../middlewares/authMiddleware');

// Todas as rotas de produtos exigem login
router.use(autenticarToken);

// Consulta: todos os perfis.
// ATENÇÃO À ORDEM: as rotas com texto fixo ("/codigo/...", "/ativos/busca") vêm ANTES de "/:id",
// senão o Express acharia que "codigo" e "ativos" são o ID de um produto.
router.get('/', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), produtoController.listarProdutos);
router.get('/codigo/:codigoBarras', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), produtoController.buscarPorCodigo);
router.get('/ativos/busca', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), produtoController.buscarAtivosPorNome);
router.get('/:id', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), produtoController.buscarProdutoPorId);

// Alterações: Administrador e Operador.
// Não há POST (produto novo só nasce na entrada por NF) nem DELETE (exclusão é sempre lógica).
router.put('/:id', autorizarPerfis('Administrador', 'Operador'), produtoController.atualizarProduto);
router.patch('/:id/desativar', autorizarPerfis('Administrador', 'Operador'), produtoController.desativarProduto);
router.patch('/:id/reativar', autorizarPerfis('Administrador', 'Operador'), produtoController.reativarProduto);

// Ajuste manual de quantidade: somente Administrador
router.patch('/:id/quantidade', autorizarPerfis('Administrador'), produtoController.ajustarQuantidade);

module.exports = router;
