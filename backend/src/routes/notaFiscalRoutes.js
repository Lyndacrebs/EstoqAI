const express = require('express');
const router = express.Router();
const notaFiscalController = require('../controllers/notaFiscalController');
const { autenticarToken, autorizarPerfis } = require('../middlewares/authMiddleware');

router.use(autenticarToken);

router.get('/', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), notaFiscalController.listarTodas);
router.get('/:id', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), notaFiscalController.buscarPorId);
router.post('/', autorizarPerfis('Administrador', 'Operador'), notaFiscalController.criar);

module.exports = router;