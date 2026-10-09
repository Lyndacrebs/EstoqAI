const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { autenticarToken, autorizarPerfis } = require('../middlewares/authMiddleware');

// Rota pública para fazer login
router.post('/login', usuarioController.login);

// A partir daqui, exige Token de Autenticação e PERFIL DE ADMINISTRADOR
router.use(autenticarToken);
router.use(autorizarPerfis('Administrador'));

router.get('/', usuarioController.listarUsuarios);
router.post('/', usuarioController.criarUsuario);
router.put('/:id', usuarioController.atualizarUsuario);
router.patch('/:id/desativar', usuarioController.desativarUsuario);

module.exports = router;