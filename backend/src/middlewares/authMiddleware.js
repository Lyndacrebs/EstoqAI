const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

function autenticarToken(req, res, next){
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ mensagem: 'Acesso negado: Token não fornecido.' });
  }

  jwt.verify(token, jwtConfig.secret, (err, usuario) => {
    if (err) {
      return res.status(403).json({ mensagem: 'Token inválido ou expirado.' });
    }
    req.usuario = usuario;
    next();
  });
}

function autorizarPerfis(...perfisPermitidos){
  return (req, res, next) => {
    if (!req.usuario || !perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({
        mensagem: 'Acesso negado: Seu perfil não tem permissão para esta ação.'
      });
    }
    next();
  };
}

module.exports = { autenticarToken, autorizarPerfis };