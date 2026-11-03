const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const usuarioRepository = require('../repositories/usuarioRepository');

// Confere o token de login e quem é o usuário.
// Regras:
//  - token ausente/inválido/vencido responde 401: é isso que faz o frontend voltar ao login;
//  - o usuário é buscado no banco a CADA requisição. Assim, se um administrador desativar alguém,
//    a pessoa perde o acesso na hora (e não só quando o token vencer, 8 horas depois);
//  - o perfil também vem do banco, então uma troca de perfil vale imediatamente.
async function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ mensagem: 'Acesso negado: Token não fornecido.' });
  }

  let dadosDoToken;
  try {
    dadosDoToken = jwt.verify(token, jwtConfig.secret);
  } catch (err) {
    return res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
  }

  try {
    const usuario = await usuarioRepository.buscarPorId(dadosDoToken.id_usuarios);

    if (!usuario) {
      return res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
    }

    // Atenção: a palavra "desativado" na mensagem é o que o frontend usa para encerrar a sessão
    if (usuario.ativo === 0) {
      return res.status(403).json({ mensagem: 'Cadastro desativado. Entre em contato com o Administrador.' });
    }

    req.usuario = {
      id_usuarios: usuario.id_usuarios,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil
    };
    next();
  } catch (error) {
    console.error('Erro ao validar o usuário do token:', error);
    return res.status(500).json({ mensagem: 'Erro interno do servidor. Tente novamente.' });
  }
}

// Barra quem não tem um dos perfis permitidos.
// A mensagem NÃO pode ter as palavras "token" nem "desativ": o frontend entenderia como sessão inválida.
function autorizarPerfis(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({
        mensagem: 'Acesso negado: seu perfil não tem permissão para esta ação.'
      });
    }
    next();
  };
}

module.exports = { autenticarToken, autorizarPerfis };