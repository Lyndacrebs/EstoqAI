const express = require('express');
const router = express.Router();
const loteController = require('../controllers/loteController');
const { autenticarToken, autorizarPerfis } = require('../middlewares/authMiddleware');

// Todas as rotas de lotes exigem autenticação
router.use(autenticarToken);

// Consulta liberada para Administrador, Operador e Visualizador
router.get('/', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), loteController.listarTodos);
router.get('/:id', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), loteController.buscarPorId);

// Criação restrita para Administrador e Operador
router.post('/', autorizarPerfis('Administrador', 'Operador'), loteController.criar);

module.exports = router;