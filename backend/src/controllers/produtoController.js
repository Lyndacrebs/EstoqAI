// Função do controlador responsável por processar a busca de produtos
function listarProdutos(req, res) {
  // Retorna uma resposta no formato JSON simulando a listagem de produtos
  res.json({
    mensagem: 'Lista de produtos'
  });
}

// Exporta as funções do controller dentro de um objeto para serem usadas nas rotas
module.exports = {
  listarProdutos
};