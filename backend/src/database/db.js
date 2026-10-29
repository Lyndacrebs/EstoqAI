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
  // Ativa o suporte nativo a Foreign Keys no SQLite
  db.run('PRAGMA foreign_keys = ON;');

  // 1. Tabela USUARIOS
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

  // 2. Tabela NOTAS FISCAIS
  db.run(`
    CREATE TABLE IF NOT EXISTS notas_fiscais (
      id_notas_fiscais INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL,
      serie INTEGER,
      chave_acesso TEXT UNIQUE,
      fornecedor TEXT,
      cnpj_fornecedor TEXT,
      data_emissao TEXT,
      arquivo TEXT,
      data_cadastro TEXT DEFAULT CURRENT_TIMESTAMP,
      id_usuarios INTEGER,
      FOREIGN KEY (id_usuarios) REFERENCES usuarios(id_usuarios)
    )
  `);

  // 3. Tabela ITENS NOTA FISCAL
  db.run(`
    CREATE TABLE IF NOT EXISTS itens_nota_fiscal (
      id_itens_nota_fiscal INTEGER PRIMARY KEY AUTOINCREMENT,
      unidade TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      descricao_original TEXT,
      id_produtos INTEGER,
      id_notas_fiscais INTEGER NOT NULL,
      FOREIGN KEY (id_produtos) REFERENCES produtos(id_produtos),
      FOREIGN KEY (id_notas_fiscais) REFERENCES notas_fiscais(id_notas_fiscais) ON DELETE CASCADE
    )
  `);

  // 4. Tabela PRODUTOS
  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id_produtos INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      codigo_barras TEXT,
      unidade TEXT NOT NULL,
      preco REAL DEFAULT 0,
      data_cadastro TEXT DEFAULT CURRENT_TIMESTAMP,
      id_itens_nota_fiscal INTEGER,
      FOREIGN KEY (id_itens_nota_fiscal) REFERENCES itens_nota_fiscal(id_itens_nota_fiscal)
    )
  `);

  // 5. Tabela LOTES
  db.run(`
    CREATE TABLE IF NOT EXISTS lotes (
      id_lotes INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_interno TEXT UNIQUE NOT NULL,
      quantidade_inicial INTEGER NOT NULL,
      quantidade_atual INTEGER NOT NULL,
      data_entrada TEXT DEFAULT CURRENT_TIMESTAMP,
      id_produtos INTEGER NOT NULL,
      FOREIGN KEY (id_produtos) REFERENCES produtos(id_produtos)
    )
  `);

  // 6. Tabela MOVIMENTACOES
  db.run(`
    CREATE TABLE IF NOT EXISTS movimentacoes (
      id_movimentacoes INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK(tipo IN ('ENTRADA', 'SAIDA')),
      data_hora TEXT DEFAULT CURRENT_TIMESTAMP,
      id_lotes INTEGER NOT NULL,
      id_usuarios INTEGER NOT NULL,
      FOREIGN KEY (id_lotes) REFERENCES lotes(id_lotes),
      FOREIGN KEY (id_usuarios) REFERENCES usuarios(id_usuarios)
    )
  `);

  // 7. Tabela HISTORICO (Auditoria)
  db.run(`
    CREATE TABLE IF NOT EXISTS historico (
      id_historico INTEGER PRIMARY KEY AUTOINCREMENT,
      entidade TEXT NOT NULL,
      id_entidade INTEGER NOT NULL,
      acao TEXT NOT NULL,
      descricao TEXT,
      data_hora TEXT DEFAULT CURRENT_TIMESTAMP,
      id_usuarios INTEGER NOT NULL,
      FOREIGN KEY (id_usuarios) REFERENCES usuarios(id_usuarios)
    )
  `);

  // Seed do Administrador Inicial (caso não exista)
  db.get("SELECT COUNT(*) AS total FROM usuarios WHERE perfil = 'Administrador'", [], (err, row) => {
    if (!err && row.total === 0) {
      const senhaHash = bcrypt.hashSync('admin123', 10);
      const sqlAdmin = `
        INSERT INTO usuarios (nome, email, senha, data_nascimento, perfil, ativo)
        VALUES (?, ?, ?, ?, ?, 1)
      `;
      db.run(sqlAdmin, ['Administrador Inicial', 'admin@estoqai.com', senhaHash, '1990-01-01', 'Administrador'], (err) => {
        if (!err) console.log('Admin inicial criado: admin@estoqai.com / admin123');
      });
    }
  });
});

module.exports = db;