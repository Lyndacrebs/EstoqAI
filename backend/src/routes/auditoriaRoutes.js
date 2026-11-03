const express = require('express');
const router = express.Router();
const auditoriaController = require('../controllers/auditoriaController');
const { autenticarToken, autorizarPerfis } = require('../middlewares/authMiddleware');

// Auditoria: somente Administrador (antes a rota era liberada também para o Operador)
router.use(autenticarToken);
router.get('/', autorizarPerfis('Administrador'), (req, res) => auditoriaController.listar(req, res));

module.exports = router;
