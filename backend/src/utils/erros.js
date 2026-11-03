// Erros "esperados" do sistema (validação, regra de negócio, não encontrado...).
// Quando algo dentro de um repositório/controller faz "throw new ErroNegocio(400, '...')",
// o controller devolve exatamente esse status e essa mensagem para o frontend.
class ErroNegocio extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

// Usado no "catch" dos controllers.
// - ErroNegocio  -> responde com o status e a mensagem dele.
// - Qualquer outro erro (bug, banco...) -> registra no terminal e responde um 500 genérico.
//   (antes o erro técnico do SQLite era devolvido ao usuário; isso expõe detalhes internos)
function tratarErro(res, error, contexto = 'processar a requisição') {
  if (error instanceof ErroNegocio) {
    return res.status(error.status).json({ mensagem: error.message });
  }
  console.error(`Erro ao ${contexto}:`, error);
  return res.status(500).json({ mensagem: 'Erro interno do servidor. Tente novamente.' });
}

module.exports = { ErroNegocio, tratarErro };
