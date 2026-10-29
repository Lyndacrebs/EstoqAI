const movimentacaoRepository = require('../repositories/movimentacaoRepository');

class MovimentacaoController {
  async criar(req, res) {
    try {
      const { tipo, id_lotes, quantidade, descricao } = req.body;
      const id_usuarios = req.usuario.id_usuarios;

      if (!tipo || !['ENTRADA', 'SAIDA'].includes(tipo.toUpperCase())) {
        return res.status(400).json({ mensagem: 'Tipo de movimentação inválido. Use ENTRADA ou SAIDA.' });
      }

      if (!id_lotes || !quantidade || quantidade <= 0) {
        return res.status(400).json({ mensagem: 'Campos id_lotes e quantidade (maior que zero) são obrigatórios.' });
      }

      const resultado = await movimentacaoRepository.criar({
        tipo: tipo.toUpperCase(),
        id_lotes,
        quantidade: Number(quantidade),
        id_usuarios,
        descricao
      });

      return res.status(201).json(resultado);
    } catch (error) {
      return res.status(400).json({ mensagem: 'Erro ao registrar movimentação.', erro: error.message });
    }
  }

  async listarTodas(req, res) {
    try {
      const movimentacoes = await movimentacaoRepository.listarTodas();
      return res.json(movimentacoes);
    } catch (error) {
      return res.status(500).json({ mensagem: 'Erro ao listar movimentações.', erro: error.message });
    }
  }
}

module.exports = new MovimentacaoController();