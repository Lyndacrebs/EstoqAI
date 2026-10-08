const db = require('../database/db');

// Lista todos os produtos cadastrados
function listarProdutos() {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM produtos';

    db.all(sql, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Busca um produto específico pelo seu ID
function buscarProdutoPorId(id) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM produtos WHERE id = ?';

    db.get(sql, [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// Insere um novo produto no banco de dados
function criarProduto(produto) {
  return new Promise((resolve, reject) => {
    const { nome, quantidade, unidade, preco } = produto;
    const sql = 'INSERT INTO produtos (nome, quantidade, unidade, preco) VALUES (?, ?, ?, ?)';

    db.run(sql, [nome, quantidade, unidade, preco], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, ...produto });
    });
  });
}

// Atualiza os dados de um produto existente
function atualizarProduto(id, produto) {
  return new Promise((resolve, reject) => {
    const { nome, quantidade, preco } = produto;
    const sql = 'UPDATE produtos SET nome = ?, quantidade = ?, preco = ? WHERE id = ?';

    db.run(sql, [nome, quantidade, preco, id], function (err) {
      if (err) return reject(err);
      // changes retorna a quantidade de linhas afetadas
      resolve({ id, alterações: this.changes });
    });
  });
}

// Remove um produto do banco pelo seu ID
function excluirProduto(id) {
  return new Promise((resolve, reject) => {
    const sql = 'DELETE FROM produtos WHERE id = ?';

    db.run(sql, [id], function (err) {
      if (err) return reject(err);
      resolve({ alterações: this.changes });
    });
  });
}

module.exports = {
  listarProdutos,
  buscarProdutoPorId,
  criarProduto,
  atualizarProduto,
  excluirProduto
};