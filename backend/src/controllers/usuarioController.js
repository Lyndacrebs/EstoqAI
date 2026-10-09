const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const usuarioRepository = require('../repositories/usuarioRepository');

// ROTA PÚBLICA DE LOGIN
async function login(req, res){
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ mensagem: 'E-mail e senha são obrigatórios.' });
    }

    const usuario = await usuarioRepository.buscarPorEmail(email);

    if (!usuario) {
      return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
    }

    // Regra: Usuários inativos não conseguem logar
    if (usuario.ativo === 0) {
      return res.status(403).json({ mensagem: 'Cadastro desativado. Entre em contato com o Administrador.' });
    }

    const senhaValida = bcrypt.compareSync(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
    }

    // Gera o Token JWT com perfil embutido
    const token = jwt.sign(
      { id_usuarios: usuario.id_usuarios, perfil: usuario.perfil, email: usuario.email },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    res.json({
      mensagem: 'Login realizado com sucesso',
      token,
      usuario: {
        id_usuarios: usuario.id_usuarios,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil
      }
    });

  } catch (error) {
    res.status(500).json({ erro: 'Erro no login', detalhes: error.message });
  }
}

// CADASTRO DE NOVO USUÁRIO (Apenas Admin)
async function criarUsuario(req, res){
  try {
    const { nome, email, senha, data_nascimento, perfil } = req.body;

    if (!nome || !email || !senha || !perfil) {
      return res.status(400).json({ mensagem: 'Nome, email, senha e perfil são obrigatórios.' });
    }

    const senhaHash = bcrypt.hashSync(senha, 10);
    const novo = await usuarioRepository.criar({ nome, email, senha: senhaHash, data_nascimento, perfil });

    res.status(201).json(novo);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao cadastrar usuário', detalhes: error.message });
  }
}

async function listarUsuarios(req, res){
  try {
    const usuarios = await usuarioRepository.listarTodos();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao listar usuários', detalhes: error.message });
  }
}

async function atualizarUsuario(req, res){
  try {
    const { id } = req.params;
    const { nome, email, data_nascimento, perfil, senha } = req.body;

    let senhaHash = null;
    if (senha) {
      senhaHash = bcrypt.hashSync(senha, 10);
    }

    const resultado = await usuarioRepository.atualizar(id, { nome, email, data_nascimento, perfil, senha: senhaHash });

    if (resultado.alteracoes === 0) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }

    res.json({ mensagem: 'Usuário atualizado com sucesso.' });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar usuário', detalhes: error.message });
  }
}

async function desativarUsuario(req, res){
  try {
    const { id } = req.params;
    const resultado = await usuarioRepository.desativar(id);

    if (resultado.alteracoes === 0) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }

    res.json({ mensagem: 'Usuário desativado com sucesso.' });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao desativar usuário', detalhes: error.message });
  }
}

module.exports = { login, criarUsuario, listarUsuarios, atualizarUsuario, desativarUsuario };