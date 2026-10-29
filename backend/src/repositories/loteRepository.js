const db = require('../database/db');

class LoteRepository {
  // Criar um novo lote associado a um produto
  async criar(loteData) {
    const { codigo_interno, quantidade_inicial, quantidade_atual, id_produtos } = loteData;
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO lotes (codigo_interno, quantidade_inicial, quantidade_atual, id_produtos)
        VALUES (?, ?, ?, ?)
      `;
      db.run(sql, [codigo_interno, quantidade_inicial, quantidade_atual, id_produtos], function (err) {
        if (err) return reject(err);
        resolve({ id_lotes: this.lastID, ...loteData });
      });
    });
  }

  // Listar todos os lotes com dados do produto relacionado
  async listarTodos() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT l.id_lotes, l.codigo_interno, l.quantidade_inicial, l.quantidade_atual, 
               l.data_entrada, l.id_produtos, p.nome AS produto_nome, p.unidade
        FROM lotes l
        JOIN produtos p ON l.id_produtos = p.id_produtos
        ORDER BY l.data_entrada DESC
      `;
      db.all(sql, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  // Buscar lote específico por ID
  async buscarPorId(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT l.*, p.nome AS produto_nome 
        FROM lotes l
        JOIN produtos p ON l.id_produtos = p.id_produtos
        WHERE l.id_lotes = ?
      `;
      db.get(sql, [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  // Atualizar o saldo atual de um lote (usado em movimentações de saída/ajuste)
  async atualizarQuantidadeAtual(id_lotes, novaQuantidade) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE lotes SET quantidade_atual = ? WHERE id_lotes = ?`;
      db.run(sql, [novaQuantidade, id_lotes], function (err) {
        if (err) return reject(err);
        resolve({ alterado: this.changes > 0 });
      });
    });
  }
}

module.exports = new LoteRepository();