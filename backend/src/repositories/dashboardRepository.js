const db = require('../database/db');

// Consultas do dashboard (resumo da tela inicial)
class DashboardRepository {
  async contarProdutosAtivos() {
    const linha = await db.buscarUm('SELECT COUNT(*) AS total FROM produtos WHERE ativo = 1');
    return linha.total;
  }

  // Produtos ativos cuja quantidade chegou no limite de estoque baixo (ou ficou abaixo dele)
  async listarEstoqueBaixo() {
    return db.buscarTodos(
      `SELECT * FROM produtos
       WHERE ativo = 1 AND quantidade <= limite_estoque_baixo
       ORDER BY quantidade ASC, nome COLLATE NOCASE`
    );
  }

  // Produtos cadastrados a partir de uma data (usado para "novos na semana")
  async contarCadastradosDesde(data) {
    const linha = await db.buscarUm('SELECT COUNT(*) AS total FROM produtos WHERE data_cadastro >= ?', [data]);
    return linha.total;
  }

  // Soma das quantidades que ENTRARAM por NF em cada dia (a partir de uma data)
  async entradasPorDia(desde) {
    return db.buscarTodos(
      `SELECT substr(nf.data_cadastro, 1, 10) AS dia, SUM(i.quantidade) AS total
       FROM itens_nota_fiscal i
       JOIN notas_fiscais nf ON nf.id_notas_fiscais = i.id_notas_fiscais
       WHERE nf.finalizada = 1 AND substr(nf.data_cadastro, 1, 10) >= ?
       GROUP BY dia`,
      [desde]
    );
  }

  // Soma das quantidades que SAÍRAM em cada dia (a partir de uma data)
  async saidasPorDia(desde) {
    return db.buscarTodos(
      `SELECT substr(s.data_cadastro, 1, 10) AS dia, SUM(i.quantidade) AS total
       FROM itens_saida i
       JOIN saidas s ON s.id_saidas = i.id_saidas
       WHERE substr(s.data_cadastro, 1, 10) >= ?
       GROUP BY dia`,
      [desde]
    );
  }
}

module.exports = new DashboardRepository();
