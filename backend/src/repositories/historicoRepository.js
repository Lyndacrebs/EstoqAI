const db = require('../database/db');
const { agora } = require('../utils/datas');

// Auditoria: registra quem fez o quê. Os registros nunca são alterados nem apagados.
class HistoricoRepository {
  // Grava uma linha de auditoria.
  // Quando a ação acontece dentro de uma transação, passe a "conexao" (tx) para que a auditoria
  // seja gravada junto: se a ação der erro e for desfeita, a auditoria também é desfeita.
  async registrar({ id_usuarios, acao, setor, detalhes, antes = '—', depois = '—' }, conexao = db) {
    const resultado = await conexao.executar(
      `INSERT INTO historico (data_hora, acao, setor, detalhes, antes, depois, id_usuarios)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [agora(), acao, setor, detalhes, antes || '—', depois || '—', id_usuarios]
    );
    return resultado.lastID;
  }

  // Lista os registros, do mais recente para o mais antigo.
  // Filtros (todos opcionais): setor e usuário (comparação exata), de/ate (datas, inclusivas).
  async listar({ setor = '', usuario = '', de = '', ate = '' } = {}) {
    const condicoes = [];
    const params = [];

    if (setor) { condicoes.push('h.setor = ?'); params.push(setor); }
    if (usuario) { condicoes.push('u.nome = ?'); params.push(usuario); }
    if (de) { condicoes.push('substr(h.data_hora, 1, 10) >= ?'); params.push(de); }
    if (ate) { condicoes.push('substr(h.data_hora, 1, 10) <= ?'); params.push(ate); }

    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

    return db.buscarTodos(
      `SELECT h.*, u.nome AS usuario_nome
       FROM historico h
       LEFT JOIN usuarios u ON h.id_usuarios = u.id_usuarios
       ${where}
       ORDER BY h.data_hora DESC, h.id_historico DESC`,
      params
    );
  }
}

module.exports = new HistoricoRepository();
