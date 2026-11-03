const express = require('express');
const router = express.Router();
const saidaController = require('../controllers/saidaController');
const { autenticarToken, autorizarPerfis } = require('../middlewares/authMiddleware');

router.use(autenticarToken);

// Consulta: todos os perfis
router.get('/', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), (req, res) => saidaController.listarTodas(req, res));
router.get('/:id', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), (req, res) => saidaController.buscarPorId(req, res));

// Registrar uma saída: Administrador e Operador
router.post('/', autorizarPerfis('Administrador', 'Operador'), (req, res) => saidaController.criar(req, res));

// Editar e excluir: somente Administrador
router.put('/:id', autorizarPerfis('Administrador'), (req, res) => saidaController.atualizar(req, res));
router.delete('/:id', autorizarPerfis('Administrador'), (req, res) => saidaController.excluir(req, res));

module.exports = router;
