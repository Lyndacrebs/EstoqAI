const db = require('../database/db');
const { agora } = require('../utils/datas');

// Saídas de estoque. Uma saída tem vários itens (produto + quantidade).
class SaidaRepository {
  // Cria a saída e seus itens. O estoque é ajustado pelo controller, na mesma transação.
  async criar({ descricao, id_usuarios }, itens, conexao = db) {
    const resultado = await conexao.executar(
      'INSERT INTO saidas (descricao, data_cadastro, id_usuarios) VALUES (?, ?, ?)',
      [descricao || '', agora(), id_usuarios]
    );
    await this.gravarItens(resultado.lastID, itens, conexao);
    return resultado.lastID;
  }

  async gravarItens(idSaida, itens, conexao = db) {
    for (const item of itens) {
      await conexao.executar(
        'INSERT INTO itens_saida (id_saidas, id_produtos, quantidade) VALUES (?, ?, ?)',
        [idSaida, item.id_produtos, item.quantidade]
      );
    }
  }

  // Listar todas as saídas (busca e datas são aplicadas no controller)
  async listarTodas(conexao = db) {
    return conexao.buscarTodos(
      `SELECT s.*, u.nome AS usuario_nome,
              (SELECT COUNT(*) FROM itens_saida i WHERE i.id_saidas = s.id_saidas) AS total_itens
       FROM saidas s
       LEFT JOIN usuarios u ON s.id_usuarios = u.id_usuarios
       ORDER BY s.data_cadastro DESC, s.id_saidas DESC`
    );
  }

  // Busca uma saída com seus itens (nome e unidade vêm do cadastro do produto)
  async buscarPorId(id, conexao = db) {
    const saida = await conexao.buscarUm(
      `SELECT s.*, u.nome AS usuario_nome
       FROM saidas s
       LEFT JOIN usuarios u ON s.id_usuarios = u.id_usuarios
       WHERE s.id_saidas = ?`,
      [id]
    );
    if (!saida) return null;

    const itens = await conexao.buscarTodos(
      `SELECT i.*, p.nome AS produto_nome, p.unidade, p.ativo AS produto_ativo
       FROM itens_saida i
       JOIN produtos p ON i.id_produtos = p.id_produtos
       WHERE i.id_saidas = ?
       ORDER BY i.id_itens_saida`,
      [id]
    );
    return { ...saida, itens };
  }

  // Edição (só Administrador): troca a lista de itens e a descrição
  async substituir(id, descricao, itens, conexao = db) {
    await conexao.executar('UPDATE saidas SET descricao = ? WHERE id_saidas = ?', [descricao || '', id]);
    await conexao.executar('DELETE FROM itens_saida WHERE id_saidas = ?', [id]);
    await this.gravarItens(id, itens, conexao);
  }

  // Exclusão (só Administrador). Os itens saem junto (ON DELETE CASCADE).
  async excluir(id, conexao = db) {
    const resultado = await conexao.executar('DELETE FROM saidas WHERE id_saidas = ?', [id]);
    return { alteracoes: resultado.changes };
  }
}

module.exports = new SaidaRepository();
