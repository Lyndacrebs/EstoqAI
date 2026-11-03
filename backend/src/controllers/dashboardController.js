const dashboardRepository = require('../repositories/dashboardRepository');
const atividadeRepository = require('../repositories/atividadeRepository');
const { formatarId } = require('../utils/identificadores');
const { diasAtras, diaDaSemana, tempoDecorrido } = require('../utils/datas');
const { tratarErro } = require('../utils/erros');

class DashboardController {
  // Resumo da tela inicial (todos os perfis)
  async resumo(req, res) {
    try {
      const [produtosAtivos, estoqueBaixo, novosNaSemana, entradas, saidas, atividades] = await Promise.all([
        dashboardRepository.contarProdutosAtivos(),
        dashboardRepository.listarEstoqueBaixo(),
        dashboardRepository.contarCadastradosDesde(diasAtras(7)),
        dashboardRepository.entradasPorDia(diasAtras(6)),
        dashboardRepository.saidasPorDia(diasAtras(6)),
        atividadeRepository.recentes(6)
      ]);

      // Os últimos 7 dias (do mais antigo até hoje), mesmo os dias sem nenhuma movimentação
      const movimentacaoSemana = [];
      for (let i = 6; i >= 0; i--) {
        const dia = diasAtras(i);
        movimentacaoSemana.push({
          dia: diaDaSemana(dia),
          entradas: (entradas.find((e) => e.dia === dia) || { total: 0 }).total,
          saidas: (saidas.find((s) => s.dia === dia) || { total: 0 }).total
        });
      }

      return res.json({
        produtosAtivos,
        produtosEstoqueBaixo: estoqueBaixo.length,
        novosNaSemana,
        estoqueBaixo: estoqueBaixo.map((p) => ({
          id: formatarId('produto', p.id_produtos),
          nome: p.nome,
          quantidade: p.quantidade,
          unidade: p.unidade,
          limite: p.limite_estoque_baixo
        })),
        movimentacaoSemana,
        atividadeRecente: atividades.map((a) => ({ tipo: a.tipo, texto: a.texto, quando: tempoDecorrido(a.data_hora) }))
      });
    } catch (error) {
      return tratarErro(res, error, 'montar o dashboard');
    }
  }
}

module.exports = new DashboardController();
