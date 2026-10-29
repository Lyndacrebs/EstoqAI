const loteRepository = require('../repositories/loteRepository');

class LoteController {
  async criar(req, res) {
    try {
      const { codigo_interno, quantidade_inicial, id_produtos } = req.body;

      // Validações básicas de regra de negócio
      if (!codigo_interno || quantidade_inicial === undefined || !id_produtos) {
        return res.status(400).json({ 
          mensagem: 'Campos obrigatórios: codigo_interno, quantidade_inicial e id_produtos.' 
        });
      }

      if (quantidade_inicial <= 0) {
        return res.status(400).json({ 
          mensagem: 'A quantidade inicial do lote deve ser maior que zero.' 
        });
      }

      // Na criação, quantidade_atual é igual a quantidade_inicial por padrão
      const novoLote = await loteRepository.criar({
        codigo_interno,
        quantidade_inicial,
        quantidade_atual: quantidade_inicial,
        id_produtos
      });

      return res.status(201).json(novoLote);
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ mensagem: 'Já existe um lote com este código interno.' });
      }
      return res.status(500).json({ mensagem: 'Erro ao criar lote.', erro: error.message });
    }
  }

  async listarTodos(req, res) {
    try {
      const lotes = await loteRepository.listarTodos();
      return res.json(lotes);
    } catch (error) {
      return res.status(500).json({ mensagem: 'Erro ao listar lotes.', erro: error.message });
    }
  }

  async buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const lote = await loteRepository.buscarPorId(id);

      if (!lote) {
        return res.status(404).json({ mensagem: 'Lote não encontrado.' });
      }

      return res.json(lote);
    } catch (error) {
      return res.status(500).json({ mensagem: 'Erro ao buscar lote.', erro: error.message });
    }
  }
}

module.exports = new LoteController();