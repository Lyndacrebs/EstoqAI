const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco SQLite:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite com sucesso.');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 0,
      unidade TEXT NOT NULL,
      preco REAL
    )
  `);
});

module.exports = db;