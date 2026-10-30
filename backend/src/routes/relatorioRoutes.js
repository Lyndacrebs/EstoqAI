const express = require('express');
const router = express.Router();
const relatorioController = require('../controllers/relatorioController');
const { autenticarToken, autorizarPerfis } = require('../middlewares/authMiddleware');

router.use(autenticarToken);

// Somente Administrador e Operador podem acessar histórico e relatórios
router.get('/historico', autorizarPerfis('Administrador', 'Operador'), relatorioController.listarHistorico);
router.get('/movimentacoes', autorizarPerfis('Administrador', 'Operador'), relatorioController.relatorioMovimentacoes);

module.exports = router;