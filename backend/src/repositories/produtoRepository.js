const db = require('../database/db');

class ProdutoRepository {
  // Lista todos os produtos cadastrados
  async listarTodos() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM produtos ORDER BY id_produtos DESC';
      db.all(sql, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  // Busca um produto específico pelo seu ID
  async buscarPorId(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM produtos WHERE id_produtos = ?';
      db.get(sql, [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  // Insere um novo produto no banco de dados
  async criar(produtoData) {
    const { nome, descricao, codigo_barras, unidade, preco } = produtoData;
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO produtos (nome, descricao, codigo_barras, unidade, preco)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.run(sql, [nome, descricao, codigo_barras, unidade, preco || 0], function (err) {
        if (err) return reject(err);
        resolve({ id_produtos: this.lastID, ...produtoData });
      });
    });
  }

  // Atualiza os dados de um produto (sem o campo quantidade, pois o saldo fica em lotes)
  async atualizar(id, produtoData) {
    const { nome, descricao, codigo_barras, unidade, preco } = produtoData;
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE produtos 
        SET nome = ?, descricao = ?, codigo_barras = ?, unidade = ?, preco = ? 
        WHERE id_produtos = ?
      `;
      db.run(sql, [nome, descricao, codigo_barras, unidade, preco, id], function (err) {
        if (err) return reject(err);
        resolve({ id_produtos: id, alteracoes: this.changes });
      });
    });
  }

  // Remove um produto do banco pelo seu ID
  async excluir(id) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM produtos WHERE id_produtos = ?';
      db.run(sql, [id], function (err) {
        if (err) return reject(err);
        resolve({ alteracoes: this.changes });
      });
    });
  }
}

// Exporta a instância pronta para uso no Controller
module.exports = new ProdutoRepository();