// Configuração do JWT (token de login).
// O segredo vem do arquivo .env (JWT_SECRET). Antes ele estava escrito aqui no código,
// o que deixava qualquer pessoa com acesso ao repositório forjar tokens de Administrador.
const segredo = process.env.JWT_SECRET;

if (!segredo) {
  // Em produção não faz sentido subir sem segredo próprio: melhor falhar logo no início.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Defina JWT_SECRET no arquivo .env antes de iniciar o servidor.');
  }
  console.warn('[AVISO] JWT_SECRET não definido no .env. Usando um segredo de DESENVOLVIMENTO (não use em produção).');
}

module.exports = {
  secret: segredo || 'estoqai_segredo_apenas_para_desenvolvimento',
  expiresIn: '8h' // O token expira após 8 horas de uso
};
