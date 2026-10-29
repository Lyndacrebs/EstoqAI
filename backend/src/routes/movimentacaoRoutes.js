const express = require('express');
const router = express.Router();
const movimentacaoController = require('../controllers/movimentacaoController');
const { autenticarToken, autorizarPerfis } = require('../middlewares/authMiddleware');

router.use(autenticarToken);

router.get('/', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), movimentacaoController.listarTodas);
router.post('/', autorizarPerfis('Administrador', 'Operador'), movimentacaoController.criar);

module.exports = router;