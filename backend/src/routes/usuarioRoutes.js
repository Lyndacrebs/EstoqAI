const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { autenticarToken, autorizarPerfis } = require('../middlewares/authMiddleware');

// Rotas públicas (não exigem login)
router.post('/login', usuarioController.login);
router.post('/recuperar-senha/verificar', usuarioController.verificarRecuperacao);
router.post('/recuperar-senha/redefinir', usuarioController.redefinirSenha);

// A partir daqui exige Token de Autenticação
router.use(autenticarToken);

// Qualquer perfil logado pode consultar os próprios dados (o frontend usa para checar a sessão)
router.get('/me', usuarioController.me);

// A partir daqui, apenas ADMINISTRADOR
router.use(autorizarPerfis('Administrador'));

router.get('/', usuarioController.listarUsuarios);
router.post('/', usuarioController.criarUsuario);
router.put('/:id', usuarioController.atualizarUsuario);
router.patch('/:id/desativar', usuarioController.desativarUsuario);
router.patch('/:id/reativar', usuarioController.reativarUsuario);

module.exports = router;
