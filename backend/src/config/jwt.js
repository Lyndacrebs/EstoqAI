module.exports = {
  secret: process.env.JWT_SECRET || 'estoqai_chave_secreta_super_segura_2026',
  expiresIn: '8h' // O token expira após 8 horas de uso
};