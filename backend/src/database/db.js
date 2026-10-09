const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco SQLite:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite com sucesso.');
  }
});

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON;');

  // Criar tabela de usuários
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id_usuarios INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      data_nascimento TEXT,
      perfil TEXT NOT NULL CHECK(perfil IN ('Administrador', 'Operador', 'Visualizador')),
      ativo INTEGER NOT NULL DEFAULT 1,
      data_cadastro TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Garante que exista ao menos 1 Administrador para o primeiro acesso
  db.get("SELECT COUNT(*) AS total FROM usuarios WHERE perfil = 'Administrador'", [], (err, row) => {
    if (!err && row.total === 0) {
      const senhaHash = bcrypt.hashSync('admin123', 10);
      const sqlAdmin = `
        INSERT INTO usuarios (nome, email, senha, data_nascimento, perfil, ativo)
        VALUES (?, ?, ?, ?, ?, 1)
      `;
      db.run(sqlAdmin, ['Administrador Inicial', 'admin@estoqai.com', senhaHash, '1990-01-01', 'Administrador'], (err) => {
        if (!err) console.log('Admin inicial criado com sucesso: admin@estoqai.com / admin123');
      });
    }
  });
});

module.exports = db;