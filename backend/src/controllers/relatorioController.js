const historicoRepository = require('../repositories/historicoRepository');

class RelatorioController {
  async listarHistorico(req, res) {
    try {
      const historico = await historicoRepository.listarHistorico();
      return res.json(historico);
    } catch (error) {
      return res.status(500).json({ mensagem: 'Erro ao buscar histórico de auditoria.', erro: error.message });
    }
  }

  async relatorioMovimentacoes(req, res) {
    try {
      const relatorio = await historicoRepository.relatorioMovimentacoes();
      return res.json(relatorio);
    } catch (error) {
      return res.status(500).json({ mensagem: 'Erro ao gerar relatório de movimentações.', erro: error.message });
    }
  }
}

module.exports = new RelatorioController();