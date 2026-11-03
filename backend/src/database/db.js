const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// O caminho do banco pode ser trocado por DB_PATH (os testes automáticos usam um banco temporário)
const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco SQLite:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite com sucesso.');
  }
});

/* ------------------------------------------------------------------------
   FUNÇÕES AUXILIARES DE ACESSO AO BANCO
   O sqlite3 trabalha com callbacks. Estas funções devolvem Promises para
   podermos usar async/await nos repositórios.
   ------------------------------------------------------------------------ */

// Executa INSERT/UPDATE/DELETE. Devolve { lastID, changes }
const rodar = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

// Devolve uma única linha (ou undefined)
const buscarUmDireto = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

// Devolve todas as linhas
const buscarTodosDireto = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

/* ------------------------------------------------------------------------
   FILA (TRAVA) DE ACESSO
   O sistema usa UMA conexão com o SQLite. Se duas requisições chegarem ao mesmo
   tempo e uma delas estiver no meio de uma transação (BEGIN ... COMMIT), os comandos
   da outra poderiam "entrar" na transação por engano (e sumir num ROLLBACK).
   Por isso todo acesso passa por esta fila: uma coisa de cada vez.
   Como o sistema é pequeno, a fila não deixa nada lento.
   ------------------------------------------------------------------------ */
let fila = Promise.resolve();

// Espera a vez e devolve a função "liberar", que precisa ser chamada ao terminar
function esperarAVez() {
  let liberar;
  const minhaVez = new Promise((resolve) => { liberar = resolve; });
  const anterior = fila;
  fila = anterior.then(() => minhaVez);
  return anterior.then(() => liberar);
}

// Versões "com fila" das funções acima (é o que os repositórios usam no dia a dia)
async function executar(sql, params = []) {
  const liberar = await esperarAVez();
  try { return await rodar(sql, params); } finally { liberar(); }
}
async function buscarUm(sql, params = []) {
  const liberar = await esperarAVez();
  try { return await buscarUmDireto(sql, params); } finally { liberar(); }
}
async function buscarTodos(sql, params = []) {
  const liberar = await esperarAVez();
  try { return await buscarTodosDireto(sql, params); } finally { liberar(); }
}

// Conexão usada DENTRO de uma transação: mesmas funções, mas sem pedir a vez de novo
// (a transação já está com a fila "reservada").
const conexaoDaTransacao = { executar: rodar, buscarUm: buscarUmDireto, buscarTodos: buscarTodosDireto };

// Roda várias operações como uma só: ou todas dão certo, ou nenhuma é gravada.
// Uso:  await db.transacao(async (tx) => { await repo.algo(..., tx); await repo.outraCoisa(..., tx); });
// Se qualquer erro acontecer dentro da função, tudo é desfeito (ROLLBACK) e o erro continua subindo.
async function transacao(operacoes) {
  const liberar = await esperarAVez();
  try {
    await rodar('BEGIN TRANSACTION');
    try {
      const resultado = await operacoes(conexaoDaTransacao);
      await rodar('COMMIT');
      return resultado;
    } catch (erro) {
      await rodar('ROLLBACK');
      throw erro;
    }
  } finally {
    liberar();
  }
}

/* ------------------------------------------------------------------------
   CRIAÇÃO DAS TABELAS
   - A quantidade em estoque fica direto no produto (não há lotes nem movimentações).
   - Produto tem categoria, quantidade, palavras-chave, limite de estoque baixo e "ativo".
   - saidas/itens_saida guardam as saídas; atividades alimenta o painel inicial.
   - tentativas_recuperacao/chaves_recuperacao controlam a recuperação de senha.
   - historico é a auditoria (setor, detalhes, antes e depois).
   ------------------------------------------------------------------------ */
async function criarTabelas() {
  // Ativa o suporte nativo a Foreign Keys no SQLite
  await rodar('PRAGMA foreign_keys = ON;');

  // 1. Tabela USUARIOS
  await rodar(`
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

  // 2. Recuperação de senha: quantas vezes cada e-mail já errou os dados (limite: 3)
  //    O e-mail é guardado mesmo quando não existe no sistema, para não revelar quem tem cadastro.
  await rodar(`
    CREATE TABLE IF NOT EXISTS tentativas_recuperacao (
      email TEXT PRIMARY KEY,
      tentativas INTEGER NOT NULL DEFAULT 0
    )
  `);

  // 3. Recuperação de senha: chave temporária entregue depois que os dados conferem
  await rodar(`
    CREATE TABLE IF NOT EXISTS chaves_recuperacao (
      chave TEXT PRIMARY KEY,
      id_usuarios INTEGER NOT NULL,
      expira_em TEXT NOT NULL,
      FOREIGN KEY (id_usuarios) REFERENCES usuarios(id_usuarios)
    )
  `);

  // 4. Tabela PRODUTOS (a quantidade em estoque fica aqui, sem lotes)
  await rodar(`
    CREATE TABLE IF NOT EXISTS produtos (
      id_produtos INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      codigo_barras TEXT UNIQUE NOT NULL,
      categoria TEXT NOT NULL DEFAULT '',
      unidade TEXT NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 0 CHECK(quantidade >= 0),
      palavras_chave TEXT DEFAULT '',
      limite_estoque_baixo INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1,
      data_cadastro TEXT NOT NULL
    )
  `);

  // 5. Tabela NOTAS FISCAIS
  //    nome = texto confirmado pelo usuário (ex.: "Fornecedora Ltda — CNPJ 12.345.678/0001-90").
  //    numero, serie, chave_acesso e data_emissao são opcionais: a leitura por IA nem sempre acha.
  //    finalizada = 0 -> entrada ainda em andamento (RASCUNHO): nada foi somado ao estoque nem criado.
  //    finalizada = 1 -> entrada concluída: tudo foi gravado de uma vez, na chamada /finalizar.
  await rodar(`
    CREATE TABLE IF NOT EXISTS notas_fiscais (
      id_notas_fiscais INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      numero INTEGER,
      serie INTEGER,
      chave_acesso TEXT UNIQUE,
      fornecedor TEXT,
      cnpj_fornecedor TEXT,
      data_emissao TEXT,
      arquivo TEXT,
      finalizada INTEGER NOT NULL DEFAULT 0,
      data_cadastro TEXT NOT NULL,
      id_usuarios INTEGER,
      FOREIGN KEY (id_usuarios) REFERENCES usuarios(id_usuarios)
    )
  `);

  // 6. Tabela ITENS NOTA FISCAL
  //    id_item_leitura = número do item na leitura da IA (1, 2, 3...). O frontend usa esse número
  //    para dizer de qual item da nota está cadastrando um produto novo.
  //    As colunas "novo_*" guardam, ENQUANTO A NOTA É RASCUNHO, os dados do produto novo que o usuário
  //    preencheu (e o código de barras já reservado para a etiqueta). O produto de verdade só é criado
  //    na finalização.
  await rodar(`
    CREATE TABLE IF NOT EXISTS itens_nota_fiscal (
      id_itens_nota_fiscal INTEGER PRIMARY KEY AUTOINCREMENT,
      id_item_leitura INTEGER,
      unidade TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      descricao_original TEXT,
      valor_unitario REAL DEFAULT 0,
      id_produtos INTEGER,
      novo_codigo_barras TEXT,
      novo_categoria TEXT,
      novo_descricao TEXT,
      novo_palavras_chave TEXT,
      novo_limite_estoque_baixo INTEGER,
      id_notas_fiscais INTEGER NOT NULL,
      FOREIGN KEY (id_produtos) REFERENCES produtos(id_produtos),
      FOREIGN KEY (id_notas_fiscais) REFERENCES notas_fiscais(id_notas_fiscais) ON DELETE CASCADE
    )
  `);

  // Contadores simples. Hoje só guarda o último número usado nos códigos de barras dos produtos.
  await rodar(`
    CREATE TABLE IF NOT EXISTS contadores (
      nome TEXT PRIMARY KEY,
      valor INTEGER NOT NULL
    )
  `);

  // 7. Tabela SAIDAS (uma saída pode ter vários produtos)
  await rodar(`
    CREATE TABLE IF NOT EXISTS saidas (
      id_saidas INTEGER PRIMARY KEY AUTOINCREMENT,
      descricao TEXT DEFAULT '',
      data_cadastro TEXT NOT NULL,
      id_usuarios INTEGER NOT NULL,
      FOREIGN KEY (id_usuarios) REFERENCES usuarios(id_usuarios)
    )
  `);

  await rodar(`
    CREATE TABLE IF NOT EXISTS itens_saida (
      id_itens_saida INTEGER PRIMARY KEY AUTOINCREMENT,
      id_saidas INTEGER NOT NULL,
      id_produtos INTEGER NOT NULL,
      quantidade INTEGER NOT NULL CHECK(quantidade >= 1),
      FOREIGN KEY (id_saidas) REFERENCES saidas(id_saidas) ON DELETE CASCADE,
      FOREIGN KEY (id_produtos) REFERENCES produtos(id_produtos)
    )
  `);

  // 8. Tabela HISTORICO (Auditoria): quem fez o quê, onde, e como ficou (antes/depois)
  await rodar(`
    CREATE TABLE IF NOT EXISTS historico (
      id_historico INTEGER PRIMARY KEY AUTOINCREMENT,
      data_hora TEXT NOT NULL,
      acao TEXT NOT NULL,
      setor TEXT NOT NULL,
      detalhes TEXT DEFAULT '',
      antes TEXT DEFAULT '—',
      depois TEXT DEFAULT '—',
      id_usuarios INTEGER NOT NULL,
      FOREIGN KEY (id_usuarios) REFERENCES usuarios(id_usuarios)
    )
  `);

  // 9. Tabela ATIVIDADES: frases curtas para a "atividade recente" do dashboard
  await rodar(`
    CREATE TABLE IF NOT EXISTS atividades (
      id_atividades INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida')),
      texto TEXT NOT NULL,
      data_hora TEXT NOT NULL
    )
  `);

  // Seed do Administrador Inicial (caso não exista)
  const admins = await buscarUmDireto("SELECT COUNT(*) AS total FROM usuarios WHERE perfil = 'Administrador'");
  if (admins.total === 0) {
    const senhaHash = bcrypt.hashSync('admin123', 10);
    await rodar(
      `INSERT INTO usuarios (nome, email, senha, data_nascimento, perfil, ativo)
       VALUES (?, ?, ?, ?, ?, 1)`,
      ['Administrador Inicial', 'admin@estoqai.com', senhaHash, '1990-01-01', 'Administrador']
    );
    console.log('Admin inicial criado: admin@estoqai.com / admin123');
  }
}

// "pronto" é uma Promise: o servidor só começa a atender depois que as tabelas existirem
db.pronto = criarTabelas();
db.pronto.catch((erro) => {
  console.error('Erro ao preparar o banco de dados:', erro.message);
  process.exit(1);
});

// As funções abaixo ficam disponíveis em quem fizer: const db = require('../database/db')
db.executar = executar;
db.buscarUm = buscarUm;
db.buscarTodos = buscarTodos;
db.transacao = transacao;

module.exports = db;