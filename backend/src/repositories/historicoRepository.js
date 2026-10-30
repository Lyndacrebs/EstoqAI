const db = require('../database/db');

class HistoricoRepository {
  async listarHistorico() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT h.id_historico, h.entidade, h.id_entidade, h.acao, h.descricao, 
               h.data_hora, u.nome AS usuario_responsavel, u.email AS usuario_email
        FROM historico h
        LEFT JOIN usuarios u ON h.id_usuarios = u.id_usuarios
        ORDER BY h.data_hora DESC
      `;
      db.all(sql, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  async relatorioMovimentacoes() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          m.id_movimentacoes,
          m.tipo,
          m.data_hora,
          l.codigo_interno AS codigo_lote,
          p.nome AS produto_nome,
          p.unidade,
          u.nome AS usuario_responsavel,
          nf.numero AS numero_nota_fiscal,
          nf.fornecedor
        FROM movimentacoes m
        JOIN lotes l ON m.id_lotes = l.id_lotes
        JOIN produtos p ON l.id_produtos = p.id_produtos
        JOIN usuarios u ON m.id_usuarios = u.id_usuarios
        LEFT JOIN itens_nota_fiscal inf ON inf.id_produtos = p.id_produtos
        LEFT JOIN notas_fiscais nf ON inf.id_notas_fiscais = nf.id_notas_fiscais
        GROUP BY m.id_movimentacoes
        ORDER BY m.data_hora DESC
      `;
      db.all(sql, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
}

module.exports = new HistoricoRepository();