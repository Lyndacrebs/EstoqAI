const notaFiscalRepository = require('../repositories/notaFiscalRepository');

class NotaFiscalController {
  async criar(req, res) {
    try {
      const { numero, serie, chave_acesso, fornecedor, cnpj_fornecedor, data_emissao, arquivo, itens } = req.body;
      const id_usuarios = req.usuario.id_usuarios; // Obtido via JWT no middleware de autenticação

      if (!numero) {
        return res.status(400).json({ mensagem: 'O número da Nota Fiscal é obrigatório.' });
      }

      if (itens && Array.isArray(itens)) {
        for (const item of itens) {
          if (!item.unidade || item.quantidade === undefined) {
            return res.status(400).json({ 
              mensagem: 'Cada item da nota precisa ter unidade e quantidade informadas.' 
            });
          }
        }
      }

      const notaCriada = await notaFiscalRepository.criar(
        { numero, serie, chave_acesso, fornecedor, cnpj_fornecedor, data_emissao, arquivo, id_usuarios },
        itens || []
      );

      return res.status(201).json(notaCriada);
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ mensagem: 'Já existe uma nota fiscal cadastrada com esta chave de acesso.' });
      }
      return res.status(500).json({ mensagem: 'Erro ao cadastrar Nota Fiscal.', erro: error.message });
    }
  }

  async listarTodas(req, res) {
    try {
      const notas = await notaFiscalRepository.listarTodas();
      return res.json(notas);
    } catch (error) {
      return res.status(500).json({ mensagem: 'Erro ao listar Notas Fiscais.', erro: error.message });
    }
  }

  async buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const nota = await notaFiscalRepository.buscarPorId(id);

      if (!nota) {
        return res.status(404).json({ mensagem: 'Nota Fiscal não encontrada.' });
      }

      return res.json(nota);
    } catch (error) {
      return res.status(500).json({ mensagem: 'Erro ao buscar Nota Fiscal.', erro: error.message });
    }
  }
}

module.exports = new NotaFiscalController();