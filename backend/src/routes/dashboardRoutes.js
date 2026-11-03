const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { autenticarToken, autorizarPerfis } = require('../middlewares/authMiddleware');

router.use(autenticarToken);
router.get('/resumo', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), (req, res) => dashboardController.resumo(req, res));

module.exports = router;
