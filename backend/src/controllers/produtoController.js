const produtoRepository = require('../repositories/produtoRepository');

// Listar todos os produtos
async function listarProdutos(req, res) {
  try {
    const produtos = await produtoRepository.listarProdutos();
    res.json(produtos);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar produtos', detalhes: error.message });
  }
}

// Buscar produto por ID
async function buscarProdutoPorId(req, res) {
  try {
    const { id } = req.params;
    const produto = await produtoRepository.buscarProdutoPorId(id);

    if (!produto) {
      return res.status(404).json({ mensagem: 'Produto não encontrado' });
    }

    res.json(produto);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar o produto', detalhes: error.message });
  }
}

// Criar novo produto
async function criarProduto(req, res) {
  try {
    const { nome, descricao, codigo_barras, unidade, preco } = req.body;

    if (!nome || !unidade) {
      return res.status(400).json({ mensagem: 'Nome e unidade são obrigatórios.' });
    }

    const novoProduto = await produtoRepository.criar({
      nome,
      descricao,
      codigo_barras,
      unidade,
      preco: preco || 0
    });

    return res.status(201).json(novoProduto);
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao criar produto', detalhes: error.message });
  }
}

// Atualizar produto existente
async function atualizarProduto(req, res) {
  try {
    const { id } = req.params;
    const { nome, quantidade, preco } = req.body;

    const resultado = await produtoRepository.atualizarProduto(id, { nome, quantidade, preco });

    if (resultado.alterações === 0) {
      return res.status(404).json({ mensagem: 'Produto não encontrado para atualização' });
    }

    res.json({ mensagem: 'Produto atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar produto', detalhes: error.message });
  }
}

// Excluir produto
async function excluirProduto(req, res) {
  try {
    const { id } = req.params;
    const resultado = await produtoRepository.excluirProduto(id);

    if (resultado.alterações === 0) {
      return res.status(404).json({ mensagem: 'Produto não encontrado para exclusão' });
    }

    res.json({ mensagem: 'Produto excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao excluir produto', detalhes: error.message });
  }
}

module.exports = {
  listarProdutos,
  buscarProdutoPorId,
  criarProduto,
  atualizarProduto,
  excluirProduto
};