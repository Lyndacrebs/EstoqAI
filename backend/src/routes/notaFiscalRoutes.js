const express = require('express');
const router = express.Router();
const notaFiscalController = require('../controllers/notaFiscalController');
const { autenticarToken, autorizarPerfis } = require('../middlewares/authMiddleware');
const { receberImagemDaNota } = require('../middlewares/uploadMiddleware');

router.use(autenticarToken);

// Consulta: todos os perfis
router.get('/', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), notaFiscalController.listarTodas);
router.get('/:id', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), notaFiscalController.buscarPorId);
router.get('/:id/imagem', autorizarPerfis('Administrador', 'Operador', 'Visualizador'), notaFiscalController.imagem);

// Entrada por NF: apenas Administrador e Operador, na ordem em que o frontend chama
router.post('/leitura', autorizarPerfis('Administrador', 'Operador'), receberImagemDaNota, (req, res) => notaFiscalController.lerImagem(req, res));
router.post('/', autorizarPerfis('Administrador', 'Operador'), (req, res) => notaFiscalController.criar(req, res));
router.post('/:id/produtos-novos', autorizarPerfis('Administrador', 'Operador'), (req, res) => notaFiscalController.cadastrarProdutoNovo(req, res));
router.post('/:id/finalizar', autorizarPerfis('Administrador', 'Operador'), (req, res) => notaFiscalController.finalizar(req, res));

module.exports = router;
