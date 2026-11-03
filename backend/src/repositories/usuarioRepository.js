const db = require('../database/db');

// Colunas que podem sair do repositório. A senha só vem em buscarPorEmail (usada no login).
const COLUNAS = 'id_usuarios, nome, email, data_nascimento, perfil, ativo, data_cadastro';

// Busca pelo e-mail ignorando maiúsculas (ana@x.com e ANA@x.com são a mesma pessoa).
// Devolve também a senha (hash), pois o login precisa conferir.
function buscarPorEmail(email, conexao = db) {
  return conexao.buscarUm('SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?)', [String(email).trim()]);
}

function buscarPorId(id, conexao = db) {
  return conexao.buscarUm(`SELECT ${COLUNAS} FROM usuarios WHERE id_usuarios = ?`, [id]);
}

// status: "ativos" | "inativos" | "todos"
function listarTodos(status = 'ativos', conexao = db) {
  let filtro = '';
  if (status === 'ativos') filtro = 'WHERE ativo = 1';
  if (status === 'inativos') filtro = 'WHERE ativo = 0';
  return conexao.buscarTodos(`SELECT ${COLUNAS} FROM usuarios ${filtro} ORDER BY nome COLLATE NOCASE`);
}

// A senha já deve chegar com hash (o controller faz isso)
async function criar(usuario, conexao = db) {
  const { nome, email, senha, data_nascimento, perfil } = usuario;
  const resultado = await conexao.executar(
    `INSERT INTO usuarios (nome, email, senha, data_nascimento, perfil, ativo)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [nome, email, senha, data_nascimento, perfil]
  );
  return buscarPorId(resultado.lastID, conexao);
}

// Se "senha" vier preenchida, troca a senha também; senão mantém a atual
async function atualizar(id, usuario, conexao = db) {
  const { nome, email, data_nascimento, perfil, senha } = usuario;

  let sql = 'UPDATE usuarios SET nome = ?, email = ?, data_nascimento = ?, perfil = ? WHERE id_usuarios = ?';
  let params = [nome, email, data_nascimento, perfil, id];

  if (senha) {
    sql = 'UPDATE usuarios SET nome = ?, email = ?, data_nascimento = ?, perfil = ?, senha = ? WHERE id_usuarios = ?';
    params = [nome, email, data_nascimento, perfil, senha, id];
  }

  const resultado = await conexao.executar(sql, params);
  return { alteracoes: resultado.changes };
}

// Usada na recuperação de senha (o usuário define a nova senha sozinho)
async function atualizarSenha(id, senhaHash, conexao = db) {
  const resultado = await conexao.executar('UPDATE usuarios SET senha = ? WHERE id_usuarios = ?', [senhaHash, id]);
  return { alteracoes: resultado.changes };
}

// Exclusão é sempre lógica: o cadastro continua no banco com ativo = 0
async function desativar(id, conexao = db) {
  const resultado = await conexao.executar('UPDATE usuarios SET ativo = 0 WHERE id_usuarios = ?', [id]);
  return { alteracoes: resultado.changes };
}

async function reativar(id, conexao = db) {
  const resultado = await conexao.executar('UPDATE usuarios SET ativo = 1 WHERE id_usuarios = ?', [id]);
  return { alteracoes: resultado.changes };
}

module.exports = { buscarPorEmail, buscarPorId, listarTodos, criar, atualizar, atualizarSenha, desativar, reativar };
