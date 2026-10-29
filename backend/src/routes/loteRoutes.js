const express = require('express');
const router = express.Router();
const loteController = require('../controllers/loteController');
const { autenticarToken, autorizarPerfis } = require('../middlewares/authMiddleware');

router.use(autenticarToken);

// Consultas
router.get('/', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), loteController.listarTodos);
router.get('/codigo/:codigo', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), loteController.buscarPorCodigo);
router.get('/:id', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), loteController.buscarPorId);

// Criação e Saída Rápida de Estoque
router.post('/', autorizarPerfis('Administrador', 'Operador'), loteController.criar);
router.post('/saida', autorizarPerfis('Administrador', 'Operador'), loteController.registrarSaidaPorCodigo);

module.exports = router;